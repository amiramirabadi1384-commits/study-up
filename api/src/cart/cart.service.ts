import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CartItemType, CategoryType, PaymentStatus, PlanType, Prisma, UserPlan } from '@prisma/client';
import { ZarinPalService } from '../zarin-pal/zarin-pal.service.js';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService, private zarinpalService: ZarinPalService) { }
  private limit = 10

  async create({ items }: CreateCartDto, userId: string) {
    if (!items?.length) {
      throw new BadRequestException(
        "سبد خرید نباید خالی باشد."
      );
    }

    // Validate required fields for each item.
    for (const item of items) {
      if (item.type === CartItemType.PLAN) {
        if (!item.planId) {
          throw new BadRequestException(
            "شناسه پلن الزامی است."
          );
        }

        if (item.pkgId) {
          throw new BadRequestException(
            "اطلاعات پکیج برای پلن معتبر نمی باشد."
          );
        }
      } else if (item.type === CartItemType.PKG) {
        if (!item.pkgId) {
          throw new BadRequestException(
            "شناسه پکیج الزامی است."
          );
        }

        if (item.planId || item.courseId) {
          throw new BadRequestException(
            "اطلاعات پلن برای پکیج معتبر نمی باشد."
          );
        }
      } else {
        throw new BadRequestException(
          "نوع آیتم سبد خرید معتبر نمی باشد."
        );
      }
    }

    // Fetch each plan/package only once.
    const planIds = [
      ...new Set(
        items
          .filter(
            i => i.type === CartItemType.PLAN && i.planId
          )
          .map(i => i.planId!)
      ),
    ];

    const pkgIds = [
      ...new Set(
        items
          .filter(
            i => i.type === CartItemType.PKG && i.pkgId
          )
          .map(i => i.pkgId!)
      ),
    ];

    // Reject duplicate package selections.
    if (
      items.filter(i => i.type === CartItemType.PKG).length !==
      pkgIds.length
    ) {
      throw new BadRequestException(
        "یک پکیج نمی تواند دوبار انتخاب شود."
      );
    }

    // Reject duplicate plan/course selections (ALL plans included, otherwise
    // an ALL plan sent twice is charged once but granted twice).
    const planSelections = new Set<string>();

    for (const item of items) {
      if (item.type !== CartItemType.PLAN) continue;

      const key = `${item.planId}:${item.courseId ?? ''}`;

      if (planSelections.has(key)) {
        throw new BadRequestException(
          "یک پلن برای یک درس نمی تواند دوبار انتخاب شود."
        );
      }

      planSelections.add(key);
    }

    const data = await this.prisma.$transaction(async tx => {
      let amount = 0;

      const plans = await tx.plan.findMany({
        where: {
          id: { in: planIds },
        },
        select: {
          id: true,
          type: true,
          price: true,
          discountPrice: true,
        },
      });

      if (plans.length !== planIds.length) {
        throw new BadRequestException(
          "یک یا تعدادی از پلن ها یافت نشده اند."
        );
      }

      const pkgs = await tx.pkg.findMany({
        where: {
          id: { in: pkgIds },
        },
        select: {
          id: true,
          price: true,
          discountPrice: true,
        },
      });

      if (pkgs.length !== pkgIds.length) {
        throw new BadRequestException(
          "یک یا تعدادی از پکیج ها یافت نشده اند."
        );
      }

      const allPlans = plans.filter(
        p => p.type === PlanType.ALL
      );

      // ALL cannot be combined with any other plan.
      if (allPlans.length > 0 && plans.length > 1) {
        throw new BadRequestException(
          "با انتخاب پلن کامل نیازی به انتخاب پلن های جدا نمی باشد."
        );
      }

      // Validate plan/course combinations.
      for (const item of items) {
        if (item.type !== CartItemType.PLAN) continue;

        const plan = plans.find(p => p.id === item.planId);

        if (!plan) {
          throw new BadRequestException(
            "پلن مورد نظر یافت نشد."
          );
        }

        if (plan.type === PlanType.ALL) {
          if (item.courseId) {
            throw new BadRequestException(
              "برای پلن کامل نباید درس جداگانه انتخاب شود."
            );
          }
        } else if (plan.type === PlanType.SINGLE) {
          if (!item.courseId) {
            throw new BadRequestException(
              "انتخاب درس برای پلن تکی الزامی است."
            );
          }

          const course = await tx.category.findUnique({
            where: {
              id: item.courseId,
              type: CategoryType.COURSE
            },
            select: {
              id: true,
            },
          });

          if (!course) {
            throw new BadRequestException(
              "درس مورد نظر یافت نشد."
            );
          }
        }
      }

      // Check whether the user already owns any selected packages.
      if (pkgIds.length > 0) {
        const prevPkgs = await tx.userPkg.findMany({
          where: {
            userId,
            pkgId: { in: pkgIds },
            publish: true,
          },
          select: {
            pkg: {
              select: {
                title: true,
              },
            },
          },
        });

        if (prevPkgs.length > 0) {
          throw new BadRequestException(
            `پکیج های ${prevPkgs
              .map(p => p.pkg.title)
              .join("، ")
            } از قبل خریداری شده اند.`
          );
        }
      }

      // Charge each ALL plan once.
      // There can be only one ALL plan selection.
      for (const plan of allPlans) {
        amount += Number(
          plan.discountPrice ?? plan.price
        );
      }

      // Charge each unique SINGLE plan/course selection once.
      const chargedSelections = new Set<string>();

      for (const item of items) {
        if (item.type !== CartItemType.PLAN) continue;

        const plan = plans.find(p => p.id === item.planId)!;

        if (plan.type !== PlanType.SINGLE) continue;

        const key = `${item.planId}:${item.courseId ?? ''}`;

        if (chargedSelections.has(key)) continue;

        chargedSelections.add(key);

        amount += Number(
          plan.discountPrice ?? plan.price
        );
      }

      // Charge each unique package once.
      for (const pkg of pkgs) {
        amount += Number(
          pkg.discountPrice ?? pkg.price
        );
      }

      const cart = await tx.cart.create({
        data: {
          userId,
          amount,
        },
      });

      await tx.cartItem.createMany({
        data: items.map(item => ({
          type: item.type,
          cartId: cart.id,

          ...(item.type === CartItemType.PLAN && {
            planId: item.planId,
            ...(item.courseId && {
              courseId: item.courseId,
            }),
          }),

          ...(item.type === CartItemType.PKG && {
            pkgId: item.pkgId,
          }),
        })),
      });

      return cart;
    });

    return {
      success: true,
      data,
    };
  }

  async findAll(userId: string, page: number = 1) {
    const carts = await this.prisma.cart.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            course: true,
            plan: true,
            pkg: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * this.limit,
      take: this.limit + 1,
    });

    const nextPage = carts.length > this.limit;
    if (nextPage) carts.pop();

    return {
      success: true,
      data: { carts, nextPage },
    };
  }

  async findAllUsers(page: number = 1) {
    const carts = await this.prisma.cart.findMany({
      include: {
        items: {
          include: {
            course: true,
            plan: true,
            pkg: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * this.limit,
      take: this.limit + 1,
    });

    const nextPage = carts.length > this.limit;
    if (nextPage) carts.pop();

    return {
      success: true,
      data: { carts, nextPage },
    };
  }

  async findOne(cartId: string, userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        userId,
      },
      include: {
        items: {
          include: {
            course: true,
            plan: true,
            pkg: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(
        "سبد مورد نظر یافت نشده است."
      );
    }

    return {
      success: true,
      data: cart,
    };
  }

  async remove(cartId: string, userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException(
        "سبد مورد نظر یافت نشده است."
      );
    }

    if (cart.userId !== userId) {
      throw new ForbiddenException(
        "سبد مورد نظر به شما تعلق ندارد."
      );
    }

    if (
      cart.status === PaymentStatus.SUCCEEDED ||
      cart.status === PaymentStatus.REFUND
    ) {
      throw new ForbiddenException(
        "امکان حذف سبد با خرید موفق یا بازگشت وجه وجود ندارد."
      );
    }

    await this.prisma.cart.delete({
      where: { id: cartId },
    });

    return {
      success: true,
      data: { id: cartId },
    };
  }

  async continuePayment(userId: string, cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException(
        "سبد خرید مورد نظر یافت نشده است."
      );
    }

    if (cart.userId !== userId) {
      throw new ForbiddenException(
        "سبد به کاربر دیگری تعلق دارد."
      );
    }

    if (
      cart.status !== PaymentStatus.PENDING &&
      cart.status !== PaymentStatus.FAILED
    ) {
      throw new ForbiddenException(
        "امکان ادامه خرید وجود ندارد."
      );
    }

    const { authority, paymentUrl } =
      await this.zarinpalService.createPayment(
        Number(cart.amount),
        `خرید محصولات سبد با آیدی: ${cartId}`
      );

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        authority,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      success: true,
      data: { paymentUrl },
    };
  }

  async failedPayment(authority: string, userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { authority, userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!cart) {
      throw new NotFoundException(
        "سبد خرید مورد نظر یافت نشده است."
      );
    }

    if (cart.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        "خرید قبلا بررسی شده و موفقیت آمیز بوده."
      );
    }

    const updated = await this.prisma.cart.updateMany({
      where: {
        authority,
        userId,
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    return {
      success: true,
      data: {
        id: cart.id,
        updated: updated.count > 0,
      },
    };
  }

  async validate(
    authority: string,
    userId: string
  ): Promise<boolean> {
    const cart = await this.prisma.cart.findFirst({
      where: {
        authority,
        userId,
      },
      select: {
        id: true,
        authority: true,
        amount: true,
        status: true,
      },
    });

    if (!cart) {
      throw new NotFoundException(
        "سبد خرید یافت نشده است."
      );
    }

    if (cart.status === PaymentStatus.SUCCEEDED) {
      return true;
    }

    if (
      cart.status === PaymentStatus.REFUND ||
      cart.status === PaymentStatus.FAILED
    ) {
      throw new BadRequestException(
        "خرید شما از قبل ناموفق شده یا مبلغ به حساب شما بازگردانده شده است."
      );
    }

    if (cart.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        "وضعیت پرداخت برای تأیید معتبر نیست."
      );
    }

    // Verify payment before opening a database transaction.
    const result = await this.zarinpalService.verifyPayment(
      authority,
      Number(cart.amount)
    );

    const code = result?.data?.code;

    if (code !== 100 && code !== 101) {
      return false;
    }

    return this.prisma.$transaction(async tx => {
      // Claim payment atomically to prevent duplicate fulfillment.
      const claim = await tx.cart.updateMany({
        where: {
          id: cart.id,
          authority,
          userId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.SUCCEEDED,
        },
      });

      if (claim.count === 0) {
        const currentCart = await tx.cart.findUnique({
          where: { id: cart.id },
          select: { status: true },
        });

        if (
          currentCart?.status === PaymentStatus.SUCCEEDED
        ) {
          return true;
        }

        if (
          currentCart?.status === PaymentStatus.FAILED ||
          currentCart?.status === PaymentStatus.REFUND
        ) {
          throw new BadRequestException(
            "پرداخت ناموفق است یا مبلغ به حساب شما بازگردانده شده است."
          );
        }

        return false;
      }

      // Every cart item contains its own plan/course/package.
      const processedCart = await tx.cart.findUnique({
        where: { id: cart.id },
        select: {
          items: {
            select: {
              type: true,
              planId: true,
              courseId: true,
              pkgId: true,
              plan: {
                select: {
                  id: true,
                  type: true,
                  durationDays: true,
                },
              },
            },
          },
        },
      });

      if (!processedCart) {
        throw new NotFoundException(
          "سبد خرید یافت نشد."
        );
      }

      const now = new Date();

      // Fulfill each individual plan selection.
      for (const item of processedCart.items) {
        if (item.type !== CartItemType.PLAN) {
          continue;
        }

        if (!item.plan) {
          throw new BadRequestException(
            "پلن سبد خرید یافت نشد."
          );
        }

        const plan = item.plan;

        if (plan.type === PlanType.ALL) {
          if (item.courseId) {
            throw new BadRequestException(
              "پلن کامل نباید دارای درس جداگانه باشد."
            );
          }

          const userPlan = await tx.userPlan.findFirst({
            where: {
              userId,
              planId: plan.id,
              courseId: null,
            },
          });

          await this.handleUserPlan(
            tx,
            userPlan,
            now,
            plan,
            userId
          );
        } else if (plan.type === PlanType.SINGLE) {
          if (!item.courseId) {
            throw new BadRequestException(
              "درس پلن تکی یافت نشد."
            );
          }

          const userPlan = await tx.userPlan.findFirst({
            where: {
              userId,
              planId: plan.id,
              courseId: item.courseId,
            },
          });

          await this.handleUserPlan(
            tx,
            userPlan,
            now,
            plan,
            userId,
            item.courseId
          );
        }
      }

      // Grant each package purchased in this cart.
      const pkgIds = [
        ...new Set(
          processedCart.items
            .filter(
              item =>
                item.type === CartItemType.PKG &&
                item.pkgId
            )
            .map(item => item.pkgId!)
        ),
      ];

      for (const pkgId of pkgIds) {
        await tx.userPkg.upsert({
          where: { userId_pkgId: { userId, pkgId } },
          create: { userId, pkgId, publish: true },
          update: { publish: true },
        });
      }

      return true;
    });
  }

  private async handleUserPlan(
    tx: Prisma.TransactionClient,
    userPlan: UserPlan | null,
    now: Date,
    plan: {
      id: string;
      durationDays: number;
    },
    userId: string,
    courseId?: string
  ): Promise<void> {
    const durationMs =
      plan.durationDays * 24 * 60 * 60 * 1000;

    if (userPlan) {
      if (userPlan.endAt > now) {
        // Extend an active subscription.
        await tx.userPlan.update({
          where: { id: userPlan.id },
          data: {
            endAt: new Date(
              userPlan.endAt.getTime() + durationMs
            ),
          },
        });
      } else {
        // Restart an expired subscription.
        await tx.userPlan.update({
          where: { id: userPlan.id },
          data: {
            startAt: now,
            endAt: new Date(now.getTime() + durationMs),
          },
        });
      }
    } else {
      // Create a subscription for this plan/course combination.
      await tx.userPlan.create({
        data: {
          startAt: now,
          endAt: new Date(now.getTime() + durationMs),
          userId,
          planId: plan.id,
          ...(courseId ? { courseId } : {}),
        },
      });
    }
  }

}

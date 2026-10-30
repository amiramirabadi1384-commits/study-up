
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AttemptStatus,
  CategoryType,
  PlanType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Returns true if the user owns an active ALL plan,
   * or an active SINGLE plan for the specified course.
   */
  async hasPlanAccess(
    userId: string,
    courseId?: string,
  ): Promise<boolean> {
    const now = new Date();

    const activePlans = await this.prisma.userPlan.findMany({
      where: {
        userId,
        endAt: { gt: now },
      },
      select: {
        courseId: true,
        plan: {
          select: {
            type: true,
          },
        },
      },
    });

    return activePlans.some((subscription) => {
      if (subscription.plan.type === PlanType.ALL) {
        return subscription.courseId === null;
      }

      return (
        subscription.plan.type === PlanType.SINGLE &&
        !!courseId &&
        subscription.courseId === courseId
      );
    });
  }

  /**
   * Checks whether the user owns a specific active plan.
   * SINGLE plans require the matching courseId.
   */
  async assertCanAccessPlan(
    userId: string,
    planId: string,
    courseId?: string,
  ): Promise<void> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        type: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('پلن مورد نظر یافت نشد.');
    }

    if (
      plan.type === PlanType.SINGLE &&
      !courseId
    ) {
      throw new ForbiddenException(
        'برای بررسی پلن تکی، شناسه درس الزامی است.',
      );
    }

    const subscription = await this.prisma.userPlan.findFirst({
      where: {
        userId,
        planId,
        endAt: { gt: new Date() },
        courseId:
          plan.type === PlanType.ALL
            ? null
            : courseId,
      },
      select: { id: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'شما اشتراک فعال این پلن را ندارید.',
      );
    }
  }

  /**
   * Checks whether a user has purchased a package.
   */
  async hasPackageAccess(
    userId: string,
    pkgId: string,
  ): Promise<boolean> {
    // same rule the cart uses to decide "already purchased"
    const ownership = await this.prisma.userPkg.findFirst({
      where: {
        userId,
        pkgId,
        publish: true,
      },
      select: { id: true },
    });

    return !!ownership;
  }

  async assertCanAccessPkg(
    userId: string,
    pkgId: string,
  ): Promise<void> {
    const pkg = await this.prisma.pkg.findUnique({
      where: { id: pkgId },
      select: { id: true },
    });

    if (!pkg) {
      throw new NotFoundException('پکیج مورد نظر یافت نشد.');
    }

    if (!(await this.hasPackageAccess(userId, pkgId))) {
      throw new ForbiddenException(
        'شما دسترسی به این پکیج را ندارید.',
      );
    }
  }

  /**
   * Returns all ancestor course IDs for a category.
   * Supports nested topic/subtopic categories.
   */
  private async getCourseIdsForCategory(
    categoryId: string,
  ): Promise<string[]> {
    const courseIds = new Set<string>();
    const visited = new Set<string>();
    let frontier = [categoryId];

    while (frontier.length > 0) {
      const current = frontier.filter(
        (id) => !visited.has(id),
      );

      if (current.length === 0) break;

      current.forEach((id) => visited.add(id));

      const categories = await this.prisma.category.findMany({
        where: {
          id: { in: current },
        },
        select: {
          id: true,
          type: true,
        },
      });

      for (const category of categories) {
        if (category.type === CategoryType.COURSE) {
          courseIds.add(category.id);
        }
      }

      const relations =
        await this.prisma.categoryRelation.findMany({
          where: {
            childId: { in: current },
          },
          select: {
            parentId: true,
          },
        });

      frontier = [
        ...new Set(
          relations
            .map((relation) => relation.parentId)
            .filter((id) => !visited.has(id)),
        ),
      ];
    }

    return [...courseIds];
  }

  /**
   * Checks access to a category-based resource.
   *
   * ALL subscription -> all categories.
   * SINGLE subscription -> only its course and descendants.
   */
  private async hasCategoryAccess(
    userId: string,
    categoryId: string,
  ): Promise<boolean> {
    const courseIds =
      await this.getCourseIdsForCategory(categoryId);

    // ALL plans do not depend on a particular course.
    if (await this.hasPlanAccess(userId)) {
      return true;
    }

    if (courseIds.length === 0) {
      return false;
    }

    for (const courseId of courseIds) {
      if (await this.hasPlanAccess(userId, courseId)) {
        return true;
      }
    }

    return false;
  }

  async assertCanAccessCategory(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد.');
    }

    if (
      !(await this.hasCategoryAccess(userId, categoryId))
    ) {
      throw new ForbiddenException(
        'شما دسترسی به این دسته‌بندی را ندارید.',
      );
    }
  }

  /**
   * Checks whether a resource is accessible through either:
   * - an active course subscription, or
   * - ownership of a package containing that resource.
   */
  private async assertResourceAccess(
    userId: string,
    categoryId: string,
    pkgIds: string[],
  ): Promise<void> {
    if (await this.hasCategoryAccess(userId, categoryId)) {
      return;
    }

    if (pkgIds.length > 0) {
      const ownedPackage = await this.prisma.userPkg.findFirst({
        where: {
          userId,
          pkgId: { in: pkgIds },
          publish: true,
        },
        select: { id: true },
      });

      if (ownedPackage) return;
    }

    throw new ForbiddenException(
      'شما مجوز دسترسی به این محتوا را ندارید.',
    );
  }

  async assertCanAccessVideo(
    userId: string,
    videoId: string,
  ): Promise<void> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        categoryId: true,
        days: {
          select: {
            day: {
              select: { pkgId: true },
            },
          },
        },
        public: true
      },
    });

    if (!video) {
      throw new NotFoundException('ویدیو یافت نشد.');
    }

    if(video.public){
      return
    }

    await this.assertResourceAccess(
      userId,
      video.categoryId,
      video.days.map((item) => item.day.pkgId),
    );
  }

  async assertCanAccessNote(
    userId: string,
    noteId: string,
  ): Promise<void> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      select: {
        categoryId: true,
        days: {
          select: {
            day: {
              select: { pkgId: true },
            },
          },
        },
        public: true
      },
    });

    if (!note) {
      throw new NotFoundException('جزوه یافت نشد.');
    }
    if(note.public){
      return
    }

    await this.assertResourceAccess(
      userId,
      note.categoryId,
      note.days.map((item) => item.day.pkgId),
    );
  }

  async assertCanAccessQuestion(
    userId: string,
    questionId: string,
  ): Promise<void> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: {
        bank: {
          select: {
            categoryId: true,
            public: true
          },
        },
        days: {
          select: {
            day: {
              select: { pkgId: true },
            },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('سوال یافت نشد.');
    }
    if(question.bank.public){
      return
    }

    await this.assertResourceAccess(
      userId,
      question.bank.categoryId,
      question.days.map((item) => item.day.pkgId),
    );
  }

  /**
   * Bank access is category/plan-based.
   * Package ownership grants access to included questions,
   * not automatically to the entire bank.
   */
  async assertCanAccessBank(
    userId: string,
    bankId: string,
  ): Promise<void> {
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
      select: {
        categoryId: true,
        public: true
      },
    });

    if (!bank) {
      throw new NotFoundException('بانک سوال یافت نشد.');
    }
    if(bank.public){
      return
    }

    if (
      !(await this.hasCategoryAccess(
        userId,
        bank.categoryId,
      ))
    ) {
      throw new ForbiddenException(
        'شما مجوز دسترسی به این بانک سوال را ندارید.',
      );
    }
  }

  async assertCanAccessDay(
    userId: string,
    dayId: string
  ) {
    const can = await this.prisma.day.findFirst({
      where: {
        id: dayId,
        pkg: {
          users: {
            some: {
              userId,
              publish: true
            }
          }
        }
      }
    })

    if (!can) {
      throw new ForbiddenException("امکان دسترسی به محتویات پکیج وجود ندارد.")
    }
  }

  /**
   * Questions of an exam (with correct answers) may only be browsed by the
   * exam's owner (for user exams) and only once the user has finished an
   * attempt, otherwise the answers leak during the exam.
   */
  async assertCanReviewExamQuestions(
    userId: string,
    examId: string
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { userId: true }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }
    if (exam.userId && exam.userId !== userId) {
      throw new ForbiddenException("آزمون مورد نظر به شما تعلق ندارد.")
    }

    const finished = await this.prisma.attempt.findFirst({
      where: {
        userId,
        examId,
        OR: [
          { status: AttemptStatus.SUBMITTED },
          { expireAt: { lte: new Date() } }
        ]
      },
      select: { id: true }
    })

    if (!finished) {
      throw new ForbiddenException("مشاهده سوالات پس از پایان آزمون امکان پذیر است.")
    }
  }

  async assertCanAccessExam(
    userId: string,
    examId: string
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: {
        id: examId
      },
      select: {
        courseId: true,
        public: true
      }
    })

    if (!exam) {
      throw new NotFoundException("آزمون مورد نظر یافت نشده است.")
    }
    if(exam.public){
      return
    }

    const now = new Date();
    const userPlans = await this.prisma.userPlan.findMany({
      where: {
        userId,
        endAt: { gt: now }
      },
      select: {
        plan: {
          select: {
            type: true,
          }
        },
        courseId: true
      }
    })

    if (userPlans.length == 0) {
      throw new ForbiddenException("هیج پلنی برای شما یافت نشده است.")
    }

    for (const userPlan of userPlans) {
      if (userPlan.plan.type == PlanType.ALL) {
        return
      }
      else if (userPlan.courseId === exam.courseId) {
        return
      }
    }

    throw new ForbiddenException("شما به آزمون مورد نظر دسترسی ندارید.")
  }
}

/*
  Warnings:

  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CartItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Exam` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExamQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `banks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exam_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `note_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `note_purchases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plan_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plan_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `saved-questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscription_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `video_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_noteId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_subscriptionPlanId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_bankId_fkey";

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_userId_fkey";

-- DropForeignKey
ALTER TABLE "ExamQuestion" DROP CONSTRAINT "ExamQuestion_examId_fkey";

-- DropForeignKey
ALTER TABLE "ExamQuestion" DROP CONSTRAINT "ExamQuestion_questionId_fkey";

-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_optionId_fkey";

-- DropForeignKey
ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_questionId_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_examId_fkey";

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_fkey";

-- DropForeignKey
ALTER TABLE "exam_categories" DROP CONSTRAINT "exam_categories_bankId_fkey";

-- DropForeignKey
ALTER TABLE "exam_categories" DROP CONSTRAINT "exam_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "note_categories" DROP CONSTRAINT "note_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "note_categories" DROP CONSTRAINT "note_categories_noteId_fkey";

-- DropForeignKey
ALTER TABLE "note_purchases" DROP CONSTRAINT "note_purchases_noteId_fkey";

-- DropForeignKey
ALTER TABLE "note_purchases" DROP CONSTRAINT "note_purchases_userId_fkey";

-- DropForeignKey
ALTER TABLE "options" DROP CONSTRAINT "options_questionId_fkey";

-- DropForeignKey
ALTER TABLE "plan_categories" DROP CONSTRAINT "plan_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "plan_categories" DROP CONSTRAINT "plan_categories_planId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_bankId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_examId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_noteId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_planId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_videoId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_bankId_fkey";

-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "results" DROP CONSTRAINT "results_examId_fkey";

-- DropForeignKey
ALTER TABLE "saved-questions" DROP CONSTRAINT "saved-questions_questionId_fkey";

-- DropForeignKey
ALTER TABLE "saved-questions" DROP CONSTRAINT "saved-questions_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_planId_fkey";

-- DropForeignKey
ALTER TABLE "user_subscriptions" DROP CONSTRAINT "user_subscriptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "video_categories" DROP CONSTRAINT "video_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "video_categories" DROP CONSTRAINT "video_categories_videoId_fkey";

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "CartItem";

-- DropTable
DROP TABLE "Exam";

-- DropTable
DROP TABLE "ExamQuestion";

-- DropTable
DROP TABLE "attempt_answers";

-- DropTable
DROP TABLE "attempts";

-- DropTable
DROP TABLE "banks";

-- DropTable
DROP TABLE "categories";

-- DropTable
DROP TABLE "exam_categories";

-- DropTable
DROP TABLE "note_categories";

-- DropTable
DROP TABLE "note_purchases";

-- DropTable
DROP TABLE "notes";

-- DropTable
DROP TABLE "options";

-- DropTable
DROP TABLE "plan_categories";

-- DropTable
DROP TABLE "plan_items";

-- DropTable
DROP TABLE "questions";

-- DropTable
DROP TABLE "results";

-- DropTable
DROP TABLE "saved-questions";

-- DropTable
DROP TABLE "subscription_plans";

-- DropTable
DROP TABLE "user_subscriptions";

-- DropTable
DROP TABLE "video_categories";

-- DropEnum
DROP TYPE "AttemptStatus";

-- DropEnum
DROP TYPE "ContentType";

-- DropEnum
DROP TYPE "ExamStatus";

-- DropEnum
DROP TYPE "ExamType";

-- DropEnum
DROP TYPE "ItemType";

-- DropEnum
DROP TYPE "PaymentStatus";

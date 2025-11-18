/*
  Warnings:

  - You are about to drop the column `reader_age` on the `mangas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "mangas" DROP COLUMN "reader_age",
ADD COLUMN     "rating" DECIMAL(3,2);

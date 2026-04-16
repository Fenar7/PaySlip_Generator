-- AlterTable: Add razorpayCustomerId to Customer
ALTER TABLE "customer" ADD COLUMN "razorpayCustomerId" TEXT;
CREATE UNIQUE INDEX "customer_razorpayCustomerId_key" ON "customer"("razorpayCustomerId");

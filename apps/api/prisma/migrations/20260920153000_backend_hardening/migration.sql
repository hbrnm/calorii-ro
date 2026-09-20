CREATE TABLE "refresh_tokens" ("id" UUID NOT NULL, "jti" TEXT NOT NULL, "token_hash" TEXT NOT NULL, "user_id" UUID NOT NULL, "expires_at" TIMESTAMPTZ(6) NOT NULL, "revoked_at" TIMESTAMPTZ(6), "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"));
ALTER TABLE "meal_items" ADD COLUMN "protein_g" DECIMAL(8,2) NOT NULL DEFAULT 0, ADD COLUMN "carbs_g" DECIMAL(8,2) NOT NULL DEFAULT 0, ADD COLUMN "fat_g" DECIMAL(8,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE UNIQUE INDEX "meals_user_id_meal_date_meal_type_key" ON "meals"("user_id", "meal_date", "meal_type");
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

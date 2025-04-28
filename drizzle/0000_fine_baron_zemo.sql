-- Create account table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'account') THEN
        CREATE TABLE "account" (
            "id" text PRIMARY KEY NOT NULL,
            "account_id" text NOT NULL,
            "provider_id" text NOT NULL,
            "user_id" text NOT NULL,
            "access_token" text,
            "refresh_token" text,
            "id_token" text,
            "access_token_expires_at" timestamp,
            "refresh_token_expires_at" timestamp,
            "scope" text,
            "password" text,
            "created_at" timestamp NOT NULL,
            "updated_at" timestamp NOT NULL
        );
    END IF;
END $$;

-- Create session table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session') THEN
        CREATE TABLE "session" (
            "id" text PRIMARY KEY NOT NULL,
            "expires_at" timestamp NOT NULL,
            "token" text NOT NULL,
            "created_at" timestamp NOT NULL,
            "updated_at" timestamp NOT NULL,
            "ip_address" text,
            "user_agent" text,
            "user_id" text NOT NULL,
            CONSTRAINT "session_token_unique" UNIQUE("token")
        );
    END IF;
END $$;

-- Create user table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user') THEN
        CREATE TABLE "user" (
            "id" text PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "email" text NOT NULL,
            "email_verified" boolean NOT NULL,
            "image" text,
            "created_at" timestamp NOT NULL,
            "updated_at" timestamp NOT NULL,
            "roles" text[] NOT NULL,
            CONSTRAINT "user_email_unique" UNIQUE("email")
        );
    END IF;
END $$;

-- Create verification table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification') THEN
        CREATE TABLE "verification" (
            "id" text PRIMARY KEY NOT NULL,
            "identifier" text NOT NULL,
            "value" text NOT NULL,
            "expires_at" timestamp NOT NULL,
            "created_at" timestamp,
            "updated_at" timestamp
        );
    END IF;
END $$;

-- Create manufacturer table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'manufacturer') THEN
        CREATE TABLE "manufacturer" (
            "id" text PRIMARY KEY NOT NULL,
            "id_type" text NOT NULL,
            "name" text NOT NULL,
            "phone" text NOT NULL,
            "address" text NOT NULL,
            "email" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Create order table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order') THEN
        CREATE TABLE "order" (
            "id" serial PRIMARY KEY NOT NULL,
            "status" text NOT NULL DEFAULT 'pending',
            "total" numeric(10, 2) NOT NULL,
            "customer_id" text NOT NULL,
            "salesperson_id" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "order_status_check" CHECK (
                "status" IN ('pending', 'sent', 'delivered')
            )
        );
    END IF;
END $$;

-- Create order_product join table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_product') THEN
        CREATE TABLE "order_product" (
            "order_id" integer NOT NULL,
            "product_id" integer NOT NULL,
            "quantity" integer NOT NULL,
            "price_at_order" numeric(10, 2) NOT NULL
        );
    END IF;
END $$;

-- Create delivery table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery') THEN
        CREATE TABLE "delivery" (
            "id" serial PRIMARY KEY NOT NULL,
            "estimated_delivery_date" date NOT NULL,
            "actual_delivery_date" date,
            "status" text NOT NULL DEFAULT 'pending',
            "tracking_number" text,
            "notes" text,
            "address" text,
            "order_id" integer NOT NULL UNIQUE,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "delivery_status_check" CHECK (
                "status" IN ('in transit', 'delivered', 'failed', 'pending')
            )
        );
    END IF;
END $$;

-- Create product table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product') THEN
        CREATE TABLE "product" (
            "id" serial PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "description" text NOT NULL,
            "price" numeric(10, 2),
            "storage_condition" text NOT NULL,
            "manufacturer_id" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'account_user_id_user_id_fk'
    ) THEN
        ALTER TABLE "account"
        ADD CONSTRAINT "account_user_id_user_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."user"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'session_user_id_user_id_fk'
    ) THEN
        ALTER TABLE "session"
        ADD CONSTRAINT "session_user_id_user_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."user"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_manufacturer_id_manufacturer_id_fk'
    ) THEN
        ALTER TABLE "product"
        ADD CONSTRAINT "product_manufacturer_id_manufacturer_id_fk"
        FOREIGN KEY ("manufacturer_id")
        REFERENCES "public"."manufacturer"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
END $$;

-- Create salesperson table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salesperson') THEN
        CREATE TABLE "salesperson" (
            "id" text PRIMARY KEY NOT NULL,
            "id_type" text NOT NULL,
            "name" text NOT NULL,
            "email" text NOT NULL UNIQUE,
            "phone" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Create customer table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'customer') THEN
        CREATE TABLE "customer" (
            "id" text PRIMARY KEY NOT NULL,
            "id_type" text NOT NULL,
            "name" text NOT NULL,
            "address" text NOT NULL,
            "phone" text NOT NULL,
            "salesperson_id" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Add foreign key constraint for customer -> salesperson
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customer_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "customer"
        ADD CONSTRAINT "customer_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
    END IF;
END $$;

-- Create warehouse table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'warehouse') THEN
        CREATE TABLE "warehouse" (
            "id" serial PRIMARY KEY NOT NULL,
            "location" text NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Create inventory table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory') THEN
        CREATE TABLE "inventory" (
            "id" serial PRIMARY KEY NOT NULL,
            "quantity" integer NOT NULL,
            "warehouse_id" integer NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Add foreign key constraint for inventory -> warehouse
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_warehouse_id_warehouse_id_fk'
    ) THEN
        ALTER TABLE "inventory"
        ADD CONSTRAINT "inventory_warehouse_id_warehouse_id_fk"
        FOREIGN KEY ("warehouse_id")
        REFERENCES "public"."warehouse"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
END $$;

-- Create inventory_product join table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_product') THEN
        CREATE TABLE "inventory_product" (
            "inventory_id" integer NOT NULL,
            "product_id" integer NOT NULL
        );
    END IF;
END $$;

-- Add foreign key constraints for inventory_product
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_inventory_id_fk'
    ) THEN
        ALTER TABLE "inventory_product"
        ADD CONSTRAINT "inventory_product_inventory_id_fk"
        FOREIGN KEY ("inventory_id")
        REFERENCES "public"."inventory"("id")
        ON DELETE cascade;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_product_id_fk'
    ) THEN
        ALTER TABLE "inventory_product"
        ADD CONSTRAINT "inventory_product_product_id_fk"
        FOREIGN KEY ("product_id")
        REFERENCES "public"."product"("id")
        ON DELETE cascade;
    END IF;
END $$;

-- Create visit table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visit') THEN
        CREATE TABLE "visit" (
            "id" serial PRIMARY KEY NOT NULL,
            "salesperson_id" text NOT NULL,
            "customer_id" text NOT NULL,
            "visit_date" timestamp NOT NULL DEFAULT now(),
            "comments" text NOT NULL,
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- Create report table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'report') THEN
        CREATE TABLE "report" (
            "id" serial PRIMARY KEY NOT NULL,
            "description" text NOT NULL,
            "date" timestamp NOT NULL,
            "salesperson_id" text NOT NULL REFERENCES "salesperson"("id"),
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- Create statement table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'statement') THEN
        CREATE TABLE "statement" (
            "id" serial PRIMARY KEY NOT NULL,
            "description" text NOT NULL,
            "date" timestamp NOT NULL,
            "salesperson_id" text NOT NULL REFERENCES "salesperson"("id"),
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- Create salesPlan table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salesPlan') THEN
        CREATE TABLE "salesPlan" (
            "id" serial PRIMARY KEY NOT NULL,
            "description" text NOT NULL,
            "date" timestamp NOT NULL,
            "salesperson_id" text NOT NULL REFERENCES "salesperson"("id"),
            "created_at" timestamp NOT NULL DEFAULT now(),
            "updated_at" timestamp NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- Add foreign key constraints for visit
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visit_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "visit"
        ADD CONSTRAINT "visit_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'visit_customer_id_customer_id_fk'
    ) THEN
        ALTER TABLE "visit"
        ADD CONSTRAINT "visit_customer_id_customer_id_fk"
        FOREIGN KEY ("customer_id")
        REFERENCES "public"."customer"("id")
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for order -> customer and order -> salesperson
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_customer_id_customer_id_fk'
    ) THEN
        ALTER TABLE "order"
        ADD CONSTRAINT "order_customer_id_customer_id_fk"
        FOREIGN KEY ("customer_id")
        REFERENCES "public"."customer"("id")
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "order"
        ADD CONSTRAINT "order_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for order_product
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_product_order_id_fk'
    ) THEN
        ALTER TABLE "order_product"
        ADD CONSTRAINT "order_product_order_id_fk"
        FOREIGN KEY ("order_id")
        REFERENCES "public"."order"("id")
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_product_product_id_fk'
    ) THEN
        ALTER TABLE "order_product"
        ADD CONSTRAINT "order_product_product_id_fk"
        FOREIGN KEY ("product_id")
        REFERENCES "public"."product"("id")
        ON DELETE CASCADE;
    END IF;

    -- Add composite primary key for order_product
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_product_pkey'
    ) THEN
        ALTER TABLE "order_product"
        ADD CONSTRAINT "order_product_pkey"
        PRIMARY KEY ("order_id", "product_id");
    END IF;
END $$;

-- Add foreign key constraint for delivery -> order
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'delivery_order_id_fk'
    ) THEN
        ALTER TABLE "delivery"
        ADD CONSTRAINT "delivery_order_id_fk"
        FOREIGN KEY ("order_id")
        REFERENCES "public"."order"("id")
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for order -> salesperson
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'order_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "order"
        ADD CONSTRAINT "order_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
    END IF;
END $$;

-- Add foreign key constraint for report -> salesperson
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'report_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "report"
        ADD CONSTRAINT "report_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
END $$;

-- Add foreign key constraint for statement -> salesperson
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'statement_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "statement"
        ADD CONSTRAINT "statement_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
END $$;

-- Add foreign key constraint for salesPlan -> salesperson
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'salesPlan_salesperson_id_salesperson_id_fk'
    ) THEN
        ALTER TABLE "salesPlan"
        ADD CONSTRAINT "salesPlan_salesperson_id_salesperson_id_fk"
        FOREIGN KEY ("salesperson_id")
        REFERENCES "public"."salesperson"("id")
        ON DELETE cascade
        ON UPDATE no action;
    END IF;
END $$;

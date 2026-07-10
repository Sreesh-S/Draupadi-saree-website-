
-- Allow admins to view/manage all profiles and orders
CREATE POLICY "admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Relax orders.status check to support full lifecycle
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('placed','pending','accepted','processing','packed','shipped','out_for_delivery','delivered','cancelled','rejected','refunded'));

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('flat','percent')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contact queries
CREATE TABLE public.contact_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_queries TO authenticated;
GRANT INSERT ON public.contact_queries TO anon;
GRANT ALL ON public.contact_queries TO service_role;
ALTER TABLE public.contact_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit query" ON public.contact_queries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read queries" ON public.contact_queries FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);
CREATE POLICY "admins manage queries" ON public.contact_queries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete queries" ON public.contact_queries FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER queries_updated BEFORE UPDATE ON public.contact_queries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  comment text,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (approved = true OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial products so admin/storefront are populated
INSERT INTO public.products (name, slug, sku, description, saree_type, fabric, category, sub_category, thumbnail, images, price, offer_price, discount_pct, stock, color, occasion, wash_care, is_featured, is_trending, is_bestseller, is_new_arrival)
VALUES
('Rukmini Kanchipuram Silk','rukmini-kanchipuram-silk','DRP-KAN-001','Pure mulberry silk Kanchipuram with gold zari border and traditional motifs.','Kanchipuram','Pure Silk','Silk Sarees','Kanchipuram','https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800','["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200"]',32999,24999,24,12,'Maroon','Wedding, Festive','Dry clean only',true,true,true,false),
('Ivory Pearl Designer Drape','ivory-pearl-designer-drape','DRP-DES-002','Hand-embellished ivory georgette with pearl work and stone embroidery.','Designer','Georgette','Designer Sarees','Party','https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800','["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200"]',45000,38500,14,8,'Ivory','Reception, Party','Dry clean only',true,false,false,true),
('Crimson Bridal Banarasi','crimson-bridal-banarasi','DRP-BNR-003','Bridal Banarasi silk woven with intricate kadhwa work and heavy zari pallu.','Banarasi','Katan Silk','Wedding Collection','Bridal','https://images.unsplash.com/photo-1610189025940-c4d5a3f9b8b3?w=800','["https://images.unsplash.com/photo-1610189025940-c4d5a3f9b8b3?w=1200"]',78000,64999,17,5,'Crimson Red','Wedding','Dry clean only',true,true,true,false),
('Emerald Mysore Silk','emerald-mysore-silk','DRP-MYS-004','Lightweight Mysore crepe silk with contrast border, ideal for daywear.','Mysore','Crepe Silk','Silk Sarees','Mysore','https://images.unsplash.com/photo-1618436917352-cd3d11ea4d15?w=800','["https://images.unsplash.com/photo-1618436917352-cd3d11ea4d15?w=1200"]',23999,18999,21,18,'Emerald Green','Festive, Office','Dry clean recommended',false,true,false,false),
('Blush Handloom Cotton','blush-handloom-cotton','DRP-COT-005','Soft handloom cotton with delicate jamdani buttis and tassel pallu.','Handloom','Cotton','Cotton Sarees','Handloom','https://images.unsplash.com/photo-1604772548532-e1b5d5a85f50?w=800','["https://images.unsplash.com/photo-1604772548532-e1b5d5a85f50?w=1200"]',9999,7499,25,25,'Blush Pink','Daily, Office','Cold hand wash',false,false,false,true),
('Royal Purple Banarasi','royal-purple-banarasi','DRP-BNR-006','Banarasi silk in regal purple with antique gold zari floral jaal.','Banarasi','Katan Silk','Festive Collection','Banarasi','https://images.unsplash.com/photo-1610189025832-4b0c5cb6c9b8?w=800','["https://images.unsplash.com/photo-1610189025832-4b0c5cb6c9b8?w=1200"]',36500,29999,18,10,'Royal Purple','Festive, Wedding','Dry clean only',true,true,false,true),
('Maroon Zari Heritage','maroon-zari-heritage','DRP-HER-007','Heritage Kanchipuram with double-warp zari and temple border.','Kanchipuram','Pure Silk','Silk Sarees','Heritage','https://images.unsplash.com/photo-1610030181087-540017dc9d6c?w=800','["https://images.unsplash.com/photo-1610030181087-540017dc9d6c?w=1200"]',27500,21999,20,9,'Deep Maroon','Wedding, Festive','Dry clean only',false,true,true,false),
('Garnet Wedding Couture','garnet-wedding-couture','DRP-WED-008','Couture bridal lehenga-saree with garnet stones and gold embroidery.','Couture','Silk Blend','Wedding Collection','Couture','https://images.unsplash.com/photo-1583391733956-6c78f60a82a7?w=800','["https://images.unsplash.com/photo-1583391733956-6c78f60a82a7?w=1200"]',68000,54999,19,4,'Garnet','Wedding','Dry clean only',true,false,true,false);

-- A demo coupon
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, active)
VALUES ('WELCOME10','10% off your first order (up to ₹2000)','percent',10,1999,2000,true);

-- Automatically assign roles to new users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email
  );

  -- Insert default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'draupadisaree.admin@gmail.com' THEN 'admin'::public.app_role
      ELSE 'customer'::public.app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;


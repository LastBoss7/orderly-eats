-- =====================================================
-- SCRIPT DE MIGRAÇÃO DE DADOS - GAMAKO
-- Execute este script APÓS o script de estrutura
-- Data de geração: 2026-01-18
-- =====================================================

-- IMPORTANTE: Execute em ordem para respeitar foreign keys!
-- 1. restaurants → 2. profiles/user_roles → 3. categories → 4. products
-- 5. tables/tabs → 6. customers/waiters → 7. salon_settings/delivery_fees
-- 8. printers → 9. orders → 10. order_items → 11. daily_closings

-- =====================================================
-- 1. RESTAURANTS
-- =====================================================
INSERT INTO restaurants (id, name, slug, logo_url, address, phone, cnpj, is_active, created_at, updated_at) VALUES
('2c8d9917-dd36-40cd-8f63-948180d70895', 'LANCHONETE E RESTAURANTE FAMILIA FUJII', 'lanchonete-e-restaurante-familia-fujii-1768256021428', 'https://ueddnccouuevidwrcjaa.supabase.co/storage/v1/object/public/restaurant-logos/2c8d9917-dd36-40cd-8f63-948180d70895/logo.png?t=1768700441602', 'av major pinheiro fros 2338, maria de maggi - suzano', '(11) 99343-1224', '71806517000110', true, '2026-01-12 22:13:35.284847+00', '2026-01-18 01:39:49.288481+00'),
('1a7797f0-f52f-4f3b-ba4e-b3c4d1ba6e74', 'PIZZARIA E RESTAURANTE MARQUES NOGUEIRA LTDA', 'pizzaria-e-restaurante-marques-nogueira-ltda-1768292537530', NULL, NULL, NULL, '02748310000114', false, '2026-01-13 08:22:18.443185+00', '2026-01-15 07:09:58.069643+00'),
('d50578e1-ae44-4ddb-b820-fc78c24ff27c', 'ROTISSERIE AOP LTDA', 'rotisserie-aop-ltda-1768756827109', NULL, NULL, NULL, '57256612000167', true, '2026-01-18 17:19:15.271938+00', '2026-01-18 17:19:15.271938+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. PROFILES (Nota: user_id deve existir em auth.users)
-- Execute separadamente ou ajuste os user_ids conforme seu novo Supabase
-- =====================================================
-- ATENÇÃO: Os user_ids abaixo são do Supabase original.
-- Você precisará recriar os usuários no novo Supabase e atualizar esses IDs.
/*
INSERT INTO profiles (id, user_id, restaurant_id, full_name, avatar_url, email_verified, created_at, updated_at) VALUES
('d06d2d2b-638a-4f14-9ab6-cdeec6616a06', 'be0d2f86-2214-4092-919f-f65959601feb', '2c8d9917-dd36-40cd-8f63-948180d70895', 'kaio fujii', NULL, false, '2026-01-12 22:13:35.284847+00', '2026-01-12 22:13:35.284847+00'),
('53e7bc6f-43d5-4b3a-8686-9edf669d3ce4', '4e23a1e5-e6ee-489c-8083-be48d360b0ef', '1a7797f0-f52f-4f3b-ba4e-b3c4d1ba6e74', 'joao de silva', NULL, false, '2026-01-13 08:22:18.443185+00', '2026-01-13 08:22:18.443185+00'),
('2037e5ab-7174-4b6e-bf41-5c0109b40efe', '009c2781-98e5-4b65-a6cc-a37b5136c2ce', 'd50578e1-ae44-4ddb-b820-fc78c24ff27c', 'alex', NULL, false, '2026-01-18 17:19:15.271938+00', '2026-01-18 17:19:15.271938+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id, user_id, role, created_at) VALUES
('b1bf5b96-94c5-4f4f-aa4e-dd96add24613', 'be0d2f86-2214-4092-919f-f65959601feb', 'admin', '2026-01-12 22:13:35.284847+00'),
('d7b356d3-75ad-47c8-b02d-99ba2c159004', '4e23a1e5-e6ee-489c-8083-be48d360b0ef', 'admin', '2026-01-13 08:22:18.443185+00'),
('bf9fd652-1806-4f64-adaf-a997907b08fb', '009c2781-98e5-4b65-a6cc-a37b5136c2ce', 'admin', '2026-01-18 17:19:15.271938+00')
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- 3. CATEGORIES
-- =====================================================
INSERT INTO categories (id, restaurant_id, name, icon, sort_order, created_at) VALUES
('e7ce576a-a359-4c65-8217-6c7597ea5ef0', '2c8d9917-dd36-40cd-8f63-948180d70895', 'Pratos Principais', NULL, 1, '2026-01-13 05:36:23.406026+00'),
('32bc2b4a-5083-480d-83ef-9995f100593a', '2c8d9917-dd36-40cd-8f63-948180d70895', 'Grelhados', NULL, 2, '2026-01-13 05:36:33.684781+00'),
('a11aa48c-bb49-4035-9be8-9468bdea5b65', '2c8d9917-dd36-40cd-8f63-948180d70895', 'Porcoes', NULL, 3, '2026-01-13 05:36:46.354884+00'),
('90ca3f7f-2d43-4d04-a1b2-ee8ca0b7a1e3', '2c8d9917-dd36-40cd-8f63-948180d70895', 'Saladas', NULL, 4, '2026-01-14 00:00:48.672461+00'),
('75c4662b-a70c-4c66-bdc0-fd7a1a427d55', '2c8d9917-dd36-40cd-8f63-948180d70895', 'Cervejas', NULL, 5, '2026-01-13 05:36:01.048494+00'),
('4aa92e5b-4c5f-4c6d-a18a-ce04549e894a', '2c8d9917-dd36-40cd-8f63-948180d70895', 'PRATOS ESPECIAIS', NULL, 0, '2026-01-17 22:09:48.2893+00'),
('521275c2-ac6d-4514-8c64-430b9a228f6e', '2c8d9917-dd36-40cd-8f63-948180d70895', 'PORÇÕES', NULL, 0, '2026-01-17 22:10:29.968353+00'),
('e4f8f394-f194-48ea-be80-48ec2bd9f028', '2c8d9917-dd36-40cd-8f63-948180d70895', 'LANCHES', NULL, 0, '2026-01-17 22:10:30.219898+00'),
('07f88b19-a4d7-458e-855d-a00fbe5434fb', '2c8d9917-dd36-40cd-8f63-948180d70895', 'GUARNIÇÕES', NULL, 0, '2026-01-17 22:10:30.47768+00'),
('2270236f-d6b1-4d2a-bba7-c95580edd6fa', '2c8d9917-dd36-40cd-8f63-948180d70895', 'BEBIDAS', NULL, 0, '2026-01-17 22:10:30.733816+00'),
('6cddaff0-25c9-44a2-8d55-adfe5b56e4fd', '2c8d9917-dd36-40cd-8f63-948180d70895', 'SUCOS 300ml', NULL, 0, '2026-01-17 22:10:31.003849+00'),
('c5451774-9991-4c57-91ca-241e96c49227', '2c8d9917-dd36-40cd-8f63-948180d70895', 'JARRAS', NULL, 0, '2026-01-17 22:10:31.256992+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. TABLES
-- =====================================================
INSERT INTO tables (id, restaurant_id, number, capacity, status, sort_order, created_at) VALUES
('d04ff4c0-268c-4d0f-b0cc-b260c24421d9', '2c8d9917-dd36-40cd-8f63-948180d70895', 1, 4, 'available', 0, '2026-01-13 02:40:51.57682+00'),
('ab15afe1-bcbc-4faa-a904-43a44134525a', '2c8d9917-dd36-40cd-8f63-948180d70895', 2, 4, 'available', 1, '2026-01-13 04:55:15.287689+00'),
('d99d76d3-12d2-478a-b12b-bf29582f2ce3', '2c8d9917-dd36-40cd-8f63-948180d70895', 3, 4, 'occupied', 2, '2026-01-13 04:55:20.151784+00'),
('4c228eb1-ebbd-40d6-8eb6-1caedb8eabf7', '2c8d9917-dd36-40cd-8f63-948180d70895', 4, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('250f252a-3c68-44fa-9592-8e5af979d107', '2c8d9917-dd36-40cd-8f63-948180d70895', 5, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('027d62cc-c220-4e2e-be4c-dfe5f7ba60ba', '2c8d9917-dd36-40cd-8f63-948180d70895', 6, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('1e672eda-9c2d-467d-85a8-3c8a9fe37f99', '2c8d9917-dd36-40cd-8f63-948180d70895', 7, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('8938a643-48aa-4a68-9254-f329e9f756dd', '2c8d9917-dd36-40cd-8f63-948180d70895', 8, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('e32d66c7-b074-4722-8d6c-3e111f8ea702', '2c8d9917-dd36-40cd-8f63-948180d70895', 9, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('26e8d001-2dc5-4377-9891-fae1cdaddacb', '2c8d9917-dd36-40cd-8f63-948180d70895', 10, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('4c803a04-1c1f-49f7-9755-f7d6d4b946b7', '2c8d9917-dd36-40cd-8f63-948180d70895', 11, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('f3004e81-a391-4340-8ffa-ced23fdf2193', '2c8d9917-dd36-40cd-8f63-948180d70895', 12, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('158b647f-5759-4722-81ca-935dee3c387c', '2c8d9917-dd36-40cd-8f63-948180d70895', 13, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('a2bc145c-83f8-4e71-8813-bb780037dc9b', '2c8d9917-dd36-40cd-8f63-948180d70895', 14, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('51752418-c81e-4da4-a73c-08d275b13498', '2c8d9917-dd36-40cd-8f63-948180d70895', 15, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('a1b1ea63-f034-4df8-8d25-575ef9adad57', '2c8d9917-dd36-40cd-8f63-948180d70895', 16, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('2b34a98d-9ac1-45bd-919a-135ce7e20c01', '2c8d9917-dd36-40cd-8f63-948180d70895', 17, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('27566682-58a7-456d-b41b-99cf11048a04', '2c8d9917-dd36-40cd-8f63-948180d70895', 18, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('d9802f25-4481-4dc8-b134-dfe0d6d2444e', '2c8d9917-dd36-40cd-8f63-948180d70895', 19, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('5a7bcf35-4c64-4753-8b66-c267a6348b52', '2c8d9917-dd36-40cd-8f63-948180d70895', 20, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('30d9f2e9-f513-495e-8e61-2970a61d06ab', '2c8d9917-dd36-40cd-8f63-948180d70895', 21, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('83f085b7-9241-46c5-b470-9b6163c9f746', '2c8d9917-dd36-40cd-8f63-948180d70895', 22, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('96b0db7d-f143-46a0-8c23-e8199069aded', '2c8d9917-dd36-40cd-8f63-948180d70895', 23, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('9999fb46-9152-4bb6-9b30-3c8f7354b7ad', '2c8d9917-dd36-40cd-8f63-948180d70895', 24, 4, 'available', 0, '2026-01-13 05:01:04.134129+00'),
('1c7f9229-0fe8-40c6-9d41-9a34e2befbb0', '2c8d9917-dd36-40cd-8f63-948180d70895', 25, 4, 'available', 0, '2026-01-18 01:04:46.833761+00'),
('c14b6480-7615-459f-afca-eb19910944c6', '2c8d9917-dd36-40cd-8f63-948180d70895', 26, 4, 'available', 0, '2026-01-18 01:04:46.833761+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. TABS
-- =====================================================
INSERT INTO tabs (id, restaurant_id, number, customer_name, customer_phone, status, created_at, updated_at) VALUES
('0ad0a0be-1b1a-4eea-9ac3-d9223acb5939', '2c8d9917-dd36-40cd-8f63-948180d70895', 1, NULL, NULL, 'available', '2026-01-13 05:34:43.375925+00', '2026-01-17 20:32:50.854688+00'),
('6a9a0062-d85d-4849-98ce-519bcd600e6b', '2c8d9917-dd36-40cd-8f63-948180d70895', 2, NULL, '1199343-1224', 'available', '2026-01-16 21:27:27.693754+00', '2026-01-17 02:47:32.237854+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. CUSTOMERS
-- =====================================================
INSERT INTO customers (id, restaurant_id, name, phone, address, number, complement, neighborhood, city, cep, state, created_at, updated_at) VALUES
('426d76ab-1648-4c3b-8f35-15140b69a05f', '2c8d9917-dd36-40cd-8f63-948180d70895', 'marcia', '11989116264', 'Rua Madame Pommery', '1260', 'apt 111', 'Vila Urupês', 'Suzano', '08615090', 'SP', '2026-01-16 18:04:28.551946+00', '2026-01-16 18:04:40.641391+00'),
('f2bc9bc1-e695-424a-85c8-b9a3f4b83288', '2c8d9917-dd36-40cd-8f63-948180d70895', 'Kaio Fujii', '11994350186', 'Rua Ary Barroso', '142', 'apt macaco da angola ', 'Vila Jau', 'Poá', '08559210', 'SP', '2026-01-13 20:51:56.863412+00', '2026-01-17 00:30:32.953004+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. WAITERS
-- =====================================================
INSERT INTO waiters (id, restaurant_id, name, phone, email, status, pin_hash, pin_salt, user_id, created_at, updated_at) VALUES
('ce420c78-06d5-450c-a1e8-1ec1e0917e12', '2c8d9917-dd36-40cd-8f63-948180d70895', 'josias', '11994350186', 'mafujii@hotmail.com', 'active', '0181872427928876ebe5b37228cbe367d49abf72fd9023f72339304de32964df', '2c75fad2-b26b-4194-a7c7-3b1399dd2a5f', NULL, '2026-01-15 23:12:25.14367+00', '2026-01-16 20:20:59.907186+00'),
('261b4976-fb67-420d-a385-5c4e1595149f', '2c8d9917-dd36-40cd-8f63-948180d70895', 'kaio', '11994350186', 'kaio.fujiI@Icloud.com', 'active', '42cd819432bd12ec347deec21676655d41d2b7db0dc59e2a06f9138d3341c1f9', '5cbfcc93-4d56-44ce-bb1d-743d3695f4b9', NULL, '2026-01-13 03:43:38.832222+00', '2026-01-17 00:43:15.452927+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. DELIVERY FEES
-- =====================================================
INSERT INTO delivery_fees (id, restaurant_id, neighborhood, city, fee, estimated_time, min_order_value, is_active, created_at, updated_at) VALUES
('f48b8e2f-d8d9-4019-b199-9457c977e230', '2c8d9917-dd36-40cd-8f63-948180d70895', 'vila amorim', 'suzano', 10, '60', NULL, true, '2026-01-15 07:11:17.97758+00', '2026-01-15 07:11:17.97758+00'),
('e3e9b11e-e10c-4267-b750-da1089187e0c', '2c8d9917-dd36-40cd-8f63-948180d70895', 'centro', 'suzano', 12, '60', NULL, true, '2026-01-15 07:11:37.522442+00', '2026-01-15 07:11:37.522442+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. PRINTERS (principais ativas)
-- =====================================================
INSERT INTO printers (id, restaurant_id, name, model, printer_name, paper_width, is_active, status, linked_categories, linked_order_types, last_seen_at, created_at, updated_at) VALUES
('f06049f7-64e8-4fa2-8bc8-04c61b9d6b07', '2c8d9917-dd36-40cd-8f63-948180d70895', 'barzinho', 'Impressora do Windows', 'barzinho', 48, true, 'connected', ARRAY['c5451774-9991-4c57-91ca-241e96c49227','2270236f-d6b1-4d2a-bba7-c95580edd6fa','32bc2b4a-5083-480d-83ef-9995f100593a','6cddaff0-25c9-44a2-8d55-adfe5b56e4fd','e4f8f394-f194-48ea-be80-48ec2bd9f028','75c4662b-a70c-4c66-bdc0-fd7a1a427d55'], ARRAY['counter','table','delivery'], '2026-01-18 14:02:36.936+00', '2026-01-17 00:23:01.900635+00', '2026-01-18 14:02:37.026037+00'),
('c18971aa-d693-481d-ad40-9fd94a68bc95', '2c8d9917-dd36-40cd-8f63-948180d70895', 'cozinhaatualit100', 'Impressora do Windows', 'cozinhaatualit100', 48, true, 'connected', ARRAY['c5451774-9991-4c57-91ca-241e96c49227','32bc2b4a-5083-480d-83ef-9995f100593a','521275c2-ac6d-4514-8c64-430b9a228f6e','6cddaff0-25c9-44a2-8d55-adfe5b56e4fd','a11aa48c-bb49-4035-9be8-9468bdea5b65','e4f8f394-f194-48ea-be80-48ec2bd9f028','4aa92e5b-4c5f-4c6d-a18a-ce04549e894a','90ca3f7f-2d43-4d04-a1b2-ee8ca0b7a1e3','07f88b19-a4d7-458e-855d-a00fbe5434fb','e7ce576a-a359-4c65-8217-6c7597ea5ef0'], ARRAY['counter','table','delivery'], '2026-01-18 14:02:36.936+00', '2026-01-16 23:09:07.530711+00', '2026-01-18 14:02:37.026037+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. SALON SETTINGS
-- =====================================================
INSERT INTO salon_settings (
  id, restaurant_id, is_open, last_opened_at, daily_order_counter, table_count, order_tab_count,
  has_dining_room, has_waiters, operation_type, service_table, service_counter, service_individual, service_self,
  auto_print_counter, auto_print_delivery, auto_print_table,
  counter_prep_min, counter_prep_max, delivery_prep_min, delivery_prep_max,
  sound_enabled, sound_counter, sound_delivery, sound_table, sound_takeaway,
  closing_printer_id, conference_printer_id, receipt_header, receipt_footer,
  show_cnpj_on_receipt, show_phone_on_receipt, show_address_on_receipt,
  print_layout, created_at, updated_at
) VALUES (
  '4dc64270-5543-427f-9da4-42a8b279ec48', '2c8d9917-dd36-40cd-8f63-948180d70895', false, '2026-01-18 14:44:02.499+00', 29, 26, 10,
  true, true, 'a-la-carte', true, true, true, false,
  true, true, true,
  40, 70, 50, 70,
  true, true, true, true, true,
  'f06049f7-64e8-4fa2-8bc8-04c61b9d6b07', 'f06049f7-64e8-4fa2-8bc8-04c61b9d6b07',
  'Bem-vindo a familia fujii', 'Agradecemos a preferencia, volte sempre ',
  true, true, true,
  '{"boldItems":true,"boldTotal":true,"customFooterLine1":"","customFooterLine2":"","customFooterLine3":"","fontSize":"normal","footerMessage":"Obrigado pela preferência!","paperCut":"full","paperSize":"80mm","paperWidth":48,"receiptTitle":"*** PEDIDO ***","showAddress":true,"showCnpj":true,"showCustomerName":true,"showCustomerPhone":true,"showDateTime":true,"showDefaultFooter":true,"showDeliveryAddress":true,"showDeliveryFee":true,"showItemNotes":true,"showItemPrices":true,"showItemSize":true,"showLogo":false,"showOrderNumber":true,"showOrderType":true,"showPaymentMethod":true,"showPhone":true,"showRestaurantName":true,"showTable":true,"showTotals":true,"showWaiter":true}'::jsonb,
  '2026-01-13 01:52:42.450301+00', '2026-01-18 16:59:00.818455+00'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. DAILY CLOSINGS
-- =====================================================
INSERT INTO daily_closings (id, restaurant_id, closing_date, total_revenue, total_orders, average_ticket, cancelled_orders, payment_breakdown, order_type_breakdown, closed_by, notes, created_at, updated_at) VALUES
('d11fee63-15c7-4c06-99b1-09681fcb55bd', '2c8d9917-dd36-40cd-8f63-948180d70895', '2026-01-15', 391, 11, 35.55, 0, '{"credit":{"count":3,"total":101},"debit":{"count":6,"total":228},"voucher":{"count":2,"total":62}}'::jsonb, '{"counter":{"count":6,"total":210},"table":{"count":5,"total":181}}'::jsonb, 'be0d2f86-2214-4092-919f-f65959601feb', NULL, '2026-01-15 05:13:03.187951+00', '2026-01-15 19:46:25.353033+00'),
('d1d4d0d1-7376-4753-a768-fc1a8ce39bfd', '2c8d9917-dd36-40cd-8f63-948180d70895', '2026-01-17', 1784, 17, 104.94, 0, '{"cash":{"count":1,"total":27},"credit":{"count":3,"total":281},"debit":{"count":4,"total":168},"não informado":{"count":4,"total":1102},"voucher":{"count":5,"total":206}}'::jsonb, '{"closing":{"count":1,"total":892},"conference":{"count":1,"total":105},"counter":{"count":6,"total":229},"delivery":{"count":1,"total":135},"tab":{"count":1,"total":47},"table":{"count":5,"total":302},"takeaway":{"count":2,"total":74}}'::jsonb, 'be0d2f86-2214-4092-919f-f65959601feb', NULL, '2026-01-17 02:47:13.816844+00', '2026-01-17 02:47:13.816844+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- NOTA SOBRE PRODUCTS, ORDERS e ORDER_ITEMS
-- =====================================================
-- Os dados de produtos (96 registros), pedidos (88 registros) e 
-- itens de pedido (134 registros) são muito extensos.
-- 
-- Para exportar esses dados:
-- 1. Acesse o Backend do Lovable Cloud
-- 2. Vá em Database → Tables
-- 3. Selecione cada tabela (products, orders, order_items)
-- 4. Use a opção "Export" para baixar como CSV
-- 5. Importe os CSVs no novo Supabase
--
-- Ou entre em contato para gerar o script completo com todos os dados.
-- =====================================================

-- FIM DO SCRIPT DE DADOS

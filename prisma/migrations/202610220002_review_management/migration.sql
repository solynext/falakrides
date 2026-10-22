ALTER TABLE "Feedback"
ADD COLUMN "journey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Feedback_type_status_featured_idx" ON "Feedback"("type", "status", "featured");

-- Illustrative reviews remain clearly identified in the admin and public cards.
INSERT INTO "Feedback" ("id","customer","type","rating","message","status","journey","featured","isSample","updatedAt") VALUES ('sample-ahmed','Ahmed Khan','Review',5,'Our airport pickup in Jeddah was easy to arrange. There was plenty of room for our family''s luggage, and the journey to Makkah was comfortable.','Approved','Jeddah Airport to Makkah',true,true,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Feedback" ("id","customer","type","rating","message","status","journey","featured","isSample","updatedAt") VALUES ('sample-fatima','Fatima Ali','Review',5,'Travelling with my parents, I wanted a calm and comfortable ride. The driver was courteous and gave us time to settle in before leaving for Madinah.','Approved','Makkah to Madinah',true,true,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Feedback" ("id","customer","type","rating","message","status","journey","featured","isSample","updatedAt") VALUES ('sample-omar','Omar Hassan','Review',5,'We booked a vehicle for our group and confirmed the pickup details in advance. A spacious ride made travelling together much easier.','Approved','Family Umrah transfer',true,true,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Feedback" ("id","customer","type","rating","message","status","journey","featured","isSample","updatedAt") VALUES ('sample-ayesha','Ayesha Malik','Review',5,'The Ziyarat trip was a lovely part of our visit. Having private transport helped our family enjoy the day at a comfortable pace.','Approved','Madinah Ziyarat',true,true,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Feedback" ("id","customer","type","rating","message","status","journey","featured","isSample","updatedAt") VALUES ('sample-yusuf','Yusuf Rahman','Review',5,'We shared our flight time and hotel location before the trip. The return journey to Jeddah Airport was smooth and the vehicle was clean.','Approved','Makkah to Jeddah Airport',true,true,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Feedback" ("id","customer","type","rating","message","status","journey","featured","isSample","updatedAt") VALUES ('sample-mariam','Mariam Ahmed','Review',5,'Booking our transfer was straightforward. We appreciated being able to discuss the luggage and vehicle size before travelling with our children.','Approved','Private family transfer',true,true,CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;

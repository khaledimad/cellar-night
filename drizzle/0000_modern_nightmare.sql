CREATE TABLE "alerts_sent" (
	"user_id" uuid NOT NULL,
	"show_id" integer NOT NULL,
	"comedian_id" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_sent_user_id_show_id_comedian_id_pk" PRIMARY KEY("user_id","show_id","comedian_id")
);
--> statement-breakpoint
ALTER TABLE "alerts_sent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "appearances" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"comedian_id" integer NOT NULL,
	"position" integer NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appearances_show_comedian_key" UNIQUE("show_id","comedian_id")
);
--> statement-breakpoint
ALTER TABLE "appearances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comedians" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_norm" text NOT NULL,
	"description" text,
	"website" text,
	"headshot_url" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comedians_name_norm_unique" UNIQUE("name_norm")
);
--> statement-breakpoint
ALTER TABLE "comedians" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "favourites" (
	"user_id" uuid NOT NULL,
	"comedian_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favourites_user_id_comedian_id_pk" PRIMARY KEY("user_id","comedian_id")
);
--> statement-breakpoint
ALTER TABLE "favourites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"dates_fetched" integer DEFAULT 0 NOT NULL,
	"shows_seen" integer DEFAULT 0 NOT NULL,
	"appearances_added" integer DEFAULT 0 NOT NULL,
	"ok" boolean,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "ingest_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"raw_name" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "rooms_raw_name_unique" UNIQUE("raw_name")
);
--> statement-breakpoint
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_date" date NOT NULL,
	"show_time" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"room_id" integer NOT NULL,
	"lineup_id" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"capacity" integer,
	"booked" integer,
	"seats_checked_at" timestamp with time zone,
	CONSTRAINT "shows_date_time_room_key" UNIQUE("show_date","show_time","room_id")
);
--> statement-breakpoint
ALTER TABLE "shows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts_sent" ADD CONSTRAINT "alerts_sent_comedian_id_comedians_id_fk" FOREIGN KEY ("comedian_id") REFERENCES "public"."comedians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_comedian_id_comedians_id_fk" FOREIGN KEY ("comedian_id") REFERENCES "public"."comedians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_comedian_id_comedians_id_fk" FOREIGN KEY ("comedian_id") REFERENCES "public"."comedians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appearances_comedian_idx" ON "appearances" USING btree ("comedian_id");--> statement-breakpoint
CREATE INDEX "favourites_comedian_idx" ON "favourites" USING btree ("comedian_id");--> statement-breakpoint
CREATE INDEX "shows_starts_at_idx" ON "shows" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "shows_show_date_idx" ON "shows" USING btree ("show_date");
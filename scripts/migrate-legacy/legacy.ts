/**
 * Read-only access to the legacy SQL Server database (`aictravelDB`).
 * Every query here is a plain SELECT — this module must never gain a write.
 * Connection settings come from LEGACY_DB_* env vars (see .env).
 */

import sql from "mssql";

export type LegacyLanguageId = 1 | 7 | 8 | 12 | 21;

/** Legacy LanguageId → new Locale. ro/hu/po/cz (11/14/16/18) are intentionally absent. */
export const LOCALE_MAP: Record<number, "en" | "de" | "ru" | "fr" | "it"> = {
  1: "en",
  7: "de",
  8: "ru",
  12: "fr",
  21: "it",
};

/** Locale sets per entity (per plan §1). Tours have no usable `it` content. */
export const TOUR_LOCALES = [1, 7, 8, 12] as const;
export const CATEGORY_LOCALES = [1, 7, 8, 12, 21] as const;
export const DESTINATION_LOCALES = [1, 7, 8, 12] as const;
export const FAQ_LOCALES = [1, 7, 8, 12] as const;

/** Approved exclusion: Tour 39 is a confirmed duplicate of Tour 2 (Phase 1 §8.2). */
export const EXCLUDED_TOUR_IDS = [39] as const;

export interface LegacyTour {
  TourId: number;
  ReferenceName: string;
  Price: number;
  TourCategoryId: number;
  Status: number;
  BestSeller: boolean;
}

export interface LegacyTourDescription {
  TourId: number;
  LanguageId: number;
  Name: string;
  MetaDescription: string;
  PageUrl: string;
  Length: string;
  Location: string;
  PickUpPoint: string;
  Includes: string;
  Excludes: string;
  Highlights: string;
  ChangesCancellations: string;
  Safety: string;
  TourGuide: string;
  WhatToPring: string;
  ShortDescription: string;
  Description: string;
  PriceBeforeDiscount: string | null;
}

export interface LegacyCategory {
  TourCategoryId: number;
  TourTypeId: number;
  ReferenceName: string;
  SortOrder: number;
  Status: number;
}

export interface LegacyCategoryDescription {
  TourCategoryId: number;
  LanguageId: number;
  Name: string;
  Description: string;
  PageUrl: string;
}

export interface LegacyTourType {
  TourTypeId: number;
  ReferenceName: string;
  SortOrder: number;
  Status: number;
}

export interface LegacyTourTypeDescription {
  TourTypeId: number;
  LanguageId: number;
  Name: string;
  Description: string;
}

export interface LegacyFaq {
  FaqId: number;
  SortOrder: number;
  Status: number;
}

export interface LegacyFaqDescription {
  FaqId: number;
  LanguageId: number;
  Question: string;
  Answer: string;
}

export interface LegacyBlog {
  BlogId: number;
  Status: number;
}

export interface LegacyBlogDescription {
  BlogId: number;
  Name: string;
  Description: string;
  ShortDescription: string;
  LinkUrl: string;
}

export interface LegacyFleet {
  FleetId: number;
  ReferenceName: string;
  Min: number;
  Max: number;
  Status: number;
}

export interface LegacyHeaderBoxRow {
  HeaderBoxId: number;
  SortOrder: number;
  Status: number;
  LanguageId: number;
  Name: string;
  Description: string;
}

export class LegacyDb {
  private pool: sql.ConnectionPool | null = null;

  async connect(): Promise<void> {
    const server = process.env.LEGACY_DB_SERVER;
    const database = process.env.LEGACY_DB_NAME;
    const user = process.env.LEGACY_DB_USER;
    const password = process.env.LEGACY_DB_PASSWORD;
    if (!server || !database || !user || !password) {
      throw new Error("Missing LEGACY_DB_SERVER / LEGACY_DB_NAME / LEGACY_DB_USER / LEGACY_DB_PASSWORD env vars.");
    }
    this.pool = await new sql.ConnectionPool({
      server,
      port: parseInt(process.env.LEGACY_DB_PORT ?? "1433", 10),
      database,
      user,
      password,
      options: { encrypt: true, trustServerCertificate: true },
      requestTimeout: 30_000,
      connectionTimeout: 15_000,
    }).connect();
  }

  async close(): Promise<void> {
    await this.pool?.close();
    this.pool = null;
  }

  private async query<T>(text: string): Promise<T[]> {
    if (!this.pool) throw new Error("LegacyDb not connected.");
    const result = await this.pool.request().query<T>(text);
    return result.recordset;
  }

  tours(): Promise<LegacyTour[]> {
    return this.query<LegacyTour>(
      `SELECT TourId, ReferenceName, Price, TourCategoryId, Status, BestSeller
       FROM O_Tour WHERE TourId NOT IN (${EXCLUDED_TOUR_IDS.join(",")}) ORDER BY TourId`,
    );
  }

  tourDescriptions(): Promise<LegacyTourDescription[]> {
    return this.query<LegacyTourDescription>(
      `SELECT TourId, LanguageId, Name, MetaDescription, PageUrl, Length, Location, PickUpPoint,
              Includes, Excludes, Highlights, ChangesCancellations, Safety, TourGuide, WhatToPring,
              ShortDescription, Description, PriceBeforeDiscount
       FROM O_Tour_Description
       WHERE LanguageId IN (${TOUR_LOCALES.join(",")})
         AND TourId NOT IN (${EXCLUDED_TOUR_IDS.join(",")})
       ORDER BY TourId, LanguageId`,
    );
  }

  categories(): Promise<LegacyCategory[]> {
    return this.query<LegacyCategory>(
      `SELECT TourCategoryId, TourTypeId, ReferenceName, SortOrder, Status
       FROM O_TourCategory ORDER BY SortOrder`,
    );
  }

  categoryDescriptions(): Promise<LegacyCategoryDescription[]> {
    return this.query<LegacyCategoryDescription>(
      `SELECT TourCategoryId, LanguageId, Name, Description, PageUrl
       FROM O_TourCategory_Description
       WHERE LanguageId IN (${CATEGORY_LOCALES.join(",")})
       ORDER BY TourCategoryId, LanguageId`,
    );
  }

  tourTypes(): Promise<LegacyTourType[]> {
    return this.query<LegacyTourType>(
      `SELECT TourTypeId, ReferenceName, SortOrder, Status FROM O_TourType ORDER BY SortOrder`,
    );
  }

  tourTypeDescriptions(): Promise<LegacyTourTypeDescription[]> {
    return this.query<LegacyTourTypeDescription>(
      `SELECT TourTypeId, LanguageId, Name, Description
       FROM O_TourType_Description
       WHERE LanguageId IN (${DESTINATION_LOCALES.join(",")})
       ORDER BY TourTypeId, LanguageId`,
    );
  }

  faqs(): Promise<LegacyFaq[]> {
    return this.query<LegacyFaq>(`SELECT FaqId, SortOrder, Status FROM O_FAQ ORDER BY SortOrder`);
  }

  faqDescriptions(): Promise<LegacyFaqDescription[]> {
    return this.query<LegacyFaqDescription>(
      `SELECT FaqId, LanguageId, Question, Answer
       FROM O_FAQ_Description
       WHERE LanguageId IN (${FAQ_LOCALES.join(",")})
       ORDER BY FaqId, LanguageId`,
    );
  }

  blogs(): Promise<LegacyBlog[]> {
    return this.query<LegacyBlog>(`SELECT BlogId, Status FROM O_Blog ORDER BY BlogId`);
  }

  blogDescriptions(): Promise<LegacyBlogDescription[]> {
    return this.query<LegacyBlogDescription>(
      `SELECT BlogId, Name, Description, ShortDescription, LinkUrl
       FROM O_Blog_Description WHERE LanguageId = 1 ORDER BY BlogId`,
    );
  }

  fleet(): Promise<LegacyFleet[]> {
    return this.query<LegacyFleet>(
      `SELECT FleetId, ReferenceName, [Min], [Max], Status FROM O_Fleet ORDER BY FleetId`,
    );
  }

  /** Header boxes + all active-locale texts — feeds the manual hero-banner handoff sheet only. */
  headerBoxes(): Promise<LegacyHeaderBoxRow[]> {
    return this.query<LegacyHeaderBoxRow>(
      `SELECT b.HeaderBoxId, b.SortOrder, b.Status, d.LanguageId, d.Name, d.Description
       FROM O_DesHeaderBox b
       JOIN O_DesHeaderBox_Description d ON d.HeaderBoxId = b.HeaderBoxId
       WHERE d.LanguageId IN (1,7,8,12,21)
       ORDER BY b.SortOrder, d.LanguageId`,
    );
  }
}

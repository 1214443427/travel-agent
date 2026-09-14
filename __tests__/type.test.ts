import { describe, expect, test } from "vitest";
import { SAMPLE_HOTEL_DATA } from "./testData/sampleHotelData";
import { HotelsSchema, PlacesSchema } from "@/app/type";
import { SAMPLE_ATTRACTIONS_DATA } from "./testData/sampleAttractionData";

describe("Schema resilience", () => {
  describe("HotelsSchema", () => {
    test("filters out invalid data while returning the rest.", () => {
      const resultArrayWithBadEntry = [
        ...SAMPLE_HOTEL_DATA.data.result,
        {
          hotel_id: "A String",
          hotel_name: null,
          review_score: "not a num",
          checkout: "not an object",
        },
      ];
      const hotelDataWithBadEntry = {
        ...SAMPLE_HOTEL_DATA,
        data: { result: resultArrayWithBadEntry },
      };

      const result = HotelsSchema.safeParse(hotelDataWithBadEntry);
      expect(result.success).toBe(true);
      expect(result.data!.data.result.length).toBe(resultArrayWithBadEntry.length - 1);
    });
  });

  describe("PlacesSchema", () => {
    test("filters out invalid data while returning the rest.", () => {
      const resultArrayWithBadEntry = [
        ...SAMPLE_ATTRACTIONS_DATA.features,
        {
          name: null,
          website: 123,
          wiki_and_media: "a string",
        },
      ];
      const dataWithBadEntry = {
        ...SAMPLE_ATTRACTIONS_DATA,
        features: resultArrayWithBadEntry,
      };

      const result = PlacesSchema.safeParse(dataWithBadEntry);
      expect(result.success).toBe(true);
      expect(result.data!.features.length).toBe(resultArrayWithBadEntry.length - 1);
    });
  });
});

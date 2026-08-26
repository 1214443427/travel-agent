import {
  BookingHandle,
  FormInputData,
  ModelOutput,
  TravelAgentContext,
  TripStream,
} from "@/app/type";
import { agent, formatterAgent } from "@/app/utils/agent";
import { run } from "@openai/agents";
import { type AgentInputItem } from "@openai/agents";

const EXAMPLE_OUTPUT: ModelOutput = {
  startDate: "2026-08-31",
  endDate: "2026-09-18",
  startLocation: "Vancouver",
  endLocation: "Beijing",
  events: [
    {
      title: "Weather",
      description:
        "Expect mild late-summer conditions in Beijing at around 23 degrees with overcast skies, so pack light layers and a compact umbrella.",
      action: null,
    },
    {
      title: "Flight from Vancouver to Beijing",
      description:
        "Depart YVR at 12:55 AM on August 30 and arrive at PEK at 9:40 AM on August 31, a 17 hr 45 min trip with one layover at Incheon, for $486 USD per person.",
      action: { type: "book_flight", flightRef: "flt_0" },
    },
    {
      title: "Hotel in Beijing",
      description:
        "Stay at Cordis, Beijing Capital Airport by Langham Hospitality Group, a 5-star property rated 8.7/10, for 18 nights at roughly $3,352 USD total.",
      action: { type: "book_hotel", hotelId: 247527 },
    },
    {
      title: "Overseas Chinese History Museum of China",
      description:
        "Visit this museum tracing the history of the Chinese diaspora, an easy half-day stop in central Beijing.",
      action: { type: "view_attraction", wikipedia: "zh:中国华侨历史博物馆" },
    },
    {
      title: "林白水故居 (Lin Baishui Former Residence Museum)",
      description: "Tour the historic residence of Lin Baishui, now preserved as a small museum.",
      action: null,
    },
    {
      title: "白纸坊街道纸文化博物馆",
      description:
        "Stop by this charming neighbourhood museum devoted to the history of paper making.",
      action: null,
    },
    {
      title: "Four Martyr's Tomb",
      description: "Pay a short visit to this historical memorial site on a walking tour.",
      action: null,
    },
    {
      title: "一二九纪念碑",
      description: "See this commemorative monument marking the December 9th student movement.",
      action: null,
    },
    {
      title: "实事求是 / “师范”碑",
      description: "Round out a walking tour with these notable inscribed stone landmarks.",
      action: null,
    },
    {
      title: "Budget Summary",
      description:
        "Flights and hotel come to roughly $4,324 USD booked, leaving about $2,676 for food, transit, entry fees and extras.",
      action: null,
    },
  ],
};

export function getFormatterPrompt(request: string, itineraries: string): AgentInputItem[] {
  return [
    {
      role: "user",
      content: `Original request:
        {"travelerCount":2,"from":"Vancouver","to":"Beijing","startDate":"2026-08-31","endDate":"2026-09-18","budget":8000} 
        
        Itinerary:
        Your Vancouver → Beijing trip is planned! Here are all the details:\n\n## Trip Overview\n- **Travelers:** 2 | **Dates:** Aug 31 – Sep 18, 2026 (18 nights) | **Budget:** $7,000 USD\n- **Weather outlook:** Mild late-summer conditions in Beijing (~23°C, overcast skies) — pack light layers and a compact umbrella just in case.\n\n## ✈️ Flight (Outbound & Return)\n**Vancouver (YVR) → Beijing Capital (PEK)** — ref: **flt_0**\n- Depart: Aug 30, 2026, 12:55 AM from Vancouver International Airport\n- Arrive: Aug 31, 2026, 9:40 AM at Beijing Capital International Airport\n- Duration: 17 hr 45 min, 1 layover at Incheon (ICN), South Korea\n- Price: **$486 USD per person** ($972 total for 2)\n\nThis option gets you into Beijing on the morning of your start date, maximizing your first day while keeping costs low.\n\n## 🏨 Accommodation\n**Cordis, Beijing Capital Airport by Langham Hospitality Group** — hotelId: **247527**\n- 5-star hotel | Review score: 8.7/10 (1,830 reviews)\n- Check-in: 14:00 | Check-out: by 12:00\n- Rate: **~$3,352 USD total** for the full 18-night stay (per-night pricing)\n- Convenient airport access with easy connections into central Beijing via express transit.\n\n## 🗺️ Recommended Attractions in Beijing\n1. **Overseas Chinese History Museum of China** (museum) — wikipedia: zh:中国华侨历史博物馆\n2. **林白水故居 (Lin Baishui Former Residence Museum)** — historic residence turned museum\n3. **白纸坊街道纸文化博物馆** — charming neighborhood paper-culture museum\n4. **Four Martyr's Tomb** — historical memorial site\n5. **一二九纪念碑** — significant commemorative monument\n6. **实事求是 / “师范”碑** — notable inscribed stone landmarks worth a walking tour\n\n## 💰 Budget Summary\n| Item | Cost |\n|---|---|\n| Round-trip flights (2 pax) | ~$972 |\n| Hotel (18 nights) | ~$3,352 |\n| Remaining for food, transit, entries & extras | ~$2,676 |\n\nYou're well under budget at roughly **$4,324 booked**, leaving comfortable room for daily expenses over nearly three weeks in Beijing. Have a wonderful trip!`,
    },
    {
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: JSON.stringify(EXAMPLE_OUTPUT) }],
    },
    {
      role: "user",
      content: `Original request:\n${request}\n\nItinerary:\n${itineraries}`,
    },
  ];
}

export async function* planTrip(
  data: FormInputData,
  signal: AbortSignal,
): AsyncGenerator<TripStream> {
  const refs = new Map<string, BookingHandle>();
  const agentContext: TravelAgentContext = { refs: refs };

  const userPrompt = JSON.stringify(data);

  const textResult = await run(agent, userPrompt, {
    stream: true,
    maxTurns: 12,
    signal: signal,
    context: agentContext,
  });

  for await (const event of textResult) {
    if (event.type !== "run_item_stream_event") continue; // skip raw token events
    if (event.name === "tool_called" && event.item.rawItem.type === "function_call") {
      yield { type: "tool_started", tool: event.item.rawItem.name };
    } else if (event.name === "tool_output" && event.item.rawItem.type === "function_call_result") {
      yield { type: "tool_finished", tool: event.item.rawItem.name };
    }
  }

  await textResult.completed;
  if (textResult.finalOutput === undefined) {
    throw new Error("LLM failed to produce a final output.");
  } else {
    yield { type: "tool_started", tool: "format_itinerary" };
    const jsonResult = await run(
      formatterAgent,
      getFormatterPrompt(userPrompt, textResult.finalOutput),
      { signal: signal },
    );
    if (!jsonResult.finalOutput) {
      throw new Error("Formatter failed to produce a final output.");
    }
    console.log(jsonResult.finalOutput);

    yield { type: "tool_finished", tool: "format_itinerary" };
    yield { type: "done", output: { ...jsonResult.finalOutput, refs: Object.fromEntries(refs) } };
  }
}

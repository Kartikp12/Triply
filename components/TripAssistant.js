import { useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";

const STARTER_QUESTIONS = [
  "Walk me through every day of this trip.",
  "Check entry fees and opening hours for our planned places.",
  "Find good stays in a specific area of my destination.",
  "Help me understand and manage this trip's budget.",
];

function formatDate(value) {
  if (!value) return "Dates not set";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Dates not set";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTripDateLabel(tripBrief) {
  const departure = tripBrief?.dates?.departureDate;
  const returning = tripBrief?.dates?.returnDate;

  if (!departure) return "Your saved journey";
  return `${formatDate(departure)}${returning ? ` – ${formatDate(returning)}` : ""}`;
}

function getMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TripAssistant({
  tripId,
  tripBrief,
  plans = [],
  initialPlanId = "",
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [activePlanId, setActivePlanId] = useState(initialPlanId || "");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setActivePlanId(initialPlanId || "");
  }, [initialPlanId]);

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      setLoadingHistory(true);
      setError("");

      try {
        const currentUser = auth?.currentUser;
        if (!currentUser) {
          throw new Error("Sign in to continue your trip conversation.");
        }

        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/trips/${tripId}/chat`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error || "Your trip conversation could not be loaded."
          );
        }

        if (active) {
          setMessages(Array.isArray(result.messages) ? result.messages : []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load this conversation.");
        }
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    if (tripId) loadConversation();

    return () => {
      active = false;
    };
  }, [tripId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  useEffect(() => {
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timeout);
  }, []);

  async function handleSend(messageOverride) {
    const message = String(messageOverride ?? draft).trim();
    if (!message || sending || loadingHistory) return;

    const optimisticMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticMessage]);
    setDraft("");
    setSending(true);
    setError("");

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error("Sign in to continue your trip conversation.");
      }

      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/trips/${tripId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          activePlanId,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "The travel assistant could not complete that response."
        );
      }

      setMessages((current) => [
        ...current.filter((item) => item.id !== optimisticMessage.id),
        result.userMessage || optimisticMessage,
        result.assistantMessage,
      ]);
    } catch (sendError) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticMessage.id)
      );
      setError(
        sendError.message ||
          "Your question is ready. Check your connection and try again."
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  const destination = tripBrief?.destination || "your trip";

  return (
    <div
      className="fixed inset-0 z-[130] flex justify-end bg-[#10251f]/35 backdrop-blur-[2px]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close trip assistant"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Triply Travel Companion"
        className="relative flex h-full w-full max-w-[560px] flex-col border-l border-[#e4e8dd] bg-[#fbfcf7] shadow-2xl"
      >
        <header className="relative z-10 border-b border-[#e7eadf] bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#203e32] text-xl text-white">
                ✦
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#16816e]">
                  YOUR PERSONAL TRAVEL COMPANION
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[#243c30]">
                  Triply Assistant
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4e8df] bg-white text-xl text-[#53645a] transition hover:bg-[#f1f4ec]"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f4f6ef] px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#304b3b]">
                {tripBrief?.origin || "Your journey"} → {destination}
              </p>
              <p className="mt-1 text-xs text-[#78857a]">
                {getTripDateLabel(tripBrief)} · {tripBrief?.travellers?.total || ""} travellers
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-[#52685a]">
              <span className="sr-only">Conversation focus</span>
              <select
                value={activePlanId}
                onChange={(event) => setActivePlanId(event.target.value)}
                className="max-w-[150px] rounded-full border border-[#dfe6d9] bg-white px-3 py-2 text-xs font-semibold text-[#315342] outline-none focus:border-[#16816e]"
              >
                <option value="">All plans</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name || plan.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {loadingHistory ? (
            <div className="flex h-full min-h-48 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#dce9df] border-t-[#16816e]" />
                <p className="mt-3 text-sm text-[#78857a]">
                  Opening your trip conversation...
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="mb-6 rounded-[26px] border border-[#e5e9de] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eaf2e7] text-lg text-[#176f60]">
                    ✦
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-[#243c30]">
                    Your trip, understood.
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#68766c]">
                    I know your saved itinerary, travel dates, group, budget and all three plans. Ask me about any detail, or let me research places and stays for your journey.
                  </p>

                  <div className="mt-5 grid gap-2">
                    {STARTER_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleSend(question)}
                        disabled={sending}
                        className="rounded-xl border border-[#e4e9df] bg-[#fbfcf8] px-3.5 py-3 text-left text-xs font-medium leading-5 text-[#405748] transition hover:border-[#a9c6ae] hover:bg-[#f2f7ef] disabled:opacity-60"
                      >
                        {question} <span className="float-right text-[#16816e]">↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] ${
                        message.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`rounded-[22px] px-4 py-3.5 shadow-sm ${
                          message.role === "user"
                            ? "rounded-br-md bg-[#203e32] text-white"
                            : "rounded-bl-md border border-[#e5e9de] bg-white text-[#344b3a]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content}
                        </p>
                      </div>

                      {message.role === "assistant" && message.sources?.length > 0 && (
                        <div className="mt-2.5 rounded-2xl border border-[#e5e9de] bg-white p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#16816e]">
                            Research sources
                          </p>
                          <div className="mt-2 space-y-2">
                            {message.sources.map((source) => (
                              <a
                                key={source.reference || source.url}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-start gap-2 text-xs leading-5 text-[#3f5d4a] transition hover:text-[#16816e]"
                              >
                                <span className="shrink-0 rounded-md bg-[#eaf2e7] px-1.5 py-0.5 font-bold text-[#176f60]">
                                  [{source.reference}]
                                </span>
                                <span className="underline decoration-[#d2ded0] underline-offset-2">
                                  {source.title}
                                </span>
                                <span aria-hidden="true" className="shrink-0">↗</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <p
                        className={`mt-1.5 px-1 text-[10px] text-[#9aa39a] ${
                          message.role === "user" ? "text-right" : ""
                        }`}
                      >
                        {message.role === "user" ? "You" : "Triply Assistant"}
                        {message.createdAt
                          ? ` · ${getMessageTime(message.createdAt)}`
                          : ""}
                      </p>
                    </div>
                  </article>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-[22px] rounded-bl-md border border-[#e5e9de] bg-white px-4 py-3.5 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#617365]">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#16816e] [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#16816e] [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#16816e]" />
                        </span>
                        Checking your trip details...
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={scrollRef} />
            </>
          )}
        </div>

        <footer className="border-t border-[#e5e9de] bg-white px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
          {error && (
            <div className="mb-3 rounded-xl border border-[#ead9c4] bg-[#fff8ed] px-3.5 py-2.5 text-xs leading-5 text-[#825d31]">
              {error}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="rounded-[22px] border border-[#dfe6da] bg-[#fbfcf8] p-2 shadow-sm transition focus-within:border-[#8ab79b] focus-within:ring-4 focus-within:ring-[#eaf2e7]"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={1500}
              placeholder="Ask anything about this trip..."
              aria-label="Ask Triply about this trip"
              className="max-h-32 min-h-[58px] w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 text-[#304b3b] outline-none placeholder:text-[#9aa49a]"
              disabled={loadingHistory || sending}
            />

            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <p className="text-[10px] text-[#9aa39a]">
                Trip context · Live research when needed
              </p>
              <button
                type="submit"
                disabled={!draft.trim() || sending || loadingHistory}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#203e32] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#176f60] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sending ? "Thinking..." : "Send"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-[10px] text-[#a0a89f]">
            Travel details and estimates are checked against available sources before being presented.
          </p>
        </footer>
      </section>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { WEEKLY_CONTENT_CALENDAR } from "@/lib/calendar";

const DAY_ICONS: Record<string, string> = {
  Monday: "💻",
  Tuesday: "🐍",
  Wednesday: "🤖",
  Thursday: "🧠",
  Friday: "📱",
  Saturday: "🛠️",
  Sunday: "💡",
};

const DAY_TOPICS: Record<string, string> = {
  Monday: "Modern frameworks, CSS architecture, Next.js, and web performance.",
  Tuesday: "Asyncio, FastAPI, scripting, automation, and data workflows.",
  Wednesday: "Generative AI, LLM prompting, agent workflows, and ethical tech.",
  Thursday: "Model training, inference pipelines, embeddings, and vector search.",
  Friday: "Cross-platform development, Flutter, React Native, and mobile UX.",
  Saturday: "CI/CD pipelines, Docker, developer productivity, and testing.",
  Sunday: "Deep dives into tech trends, engineering leadership, and future outlook.",
};

const PRESETS = [
  { label: "08:00 AM PKT (Default)", time: "08:00" },
  { label: "09:30 AM PKT", time: "09:30" },
  { label: "01:00 PM PKT", time: "13:00" },
  { label: "06:00 PM PKT", time: "18:00" },
];

export default function Home() {
  const [postingTime, setPostingTime] = useState<string>("08:00");
  const [toast, setToast] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [karachiClock, setKarachiClock] = useState<string>("");
  const [utcClock, setUtcClock] = useState<string>("");
  const [todayWeekday, setTodayWeekday] = useState<string>("");

  // Derived UTC calculation from postingTime (Asia/Karachi is UTC+5)
  const [hStr, mStr] = postingTime.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const pktTotalMinutes = h * 60 + m;
  const utcTotalMinutes = (pktTotalMinutes - 300 + 1440) % 1440;
  const utcH = Math.floor(utcTotalMinutes / 60);
  const utcM = utcTotalMinutes % 60;
  const utcHFormatted = utcH.toString().padStart(2, "0");
  const utcMFormatted = utcM.toString().padStart(2, "0");
  const utcTimeStr = `${utcHFormatted}:${utcMFormatted} UTC`;
  const cronExpression = `${utcM} ${utcH} * * *`;

  // Live clocks in Karachi & UTC
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setKarachiClock(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Karachi",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setUtcClock(
        now.toLocaleTimeString("en-US", {
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      const weekday = now.toLocaleDateString("en-US", {
        timeZone: "Asia/Karachi",
        weekday: "long",
      });
      setTodayWeekday(weekday);
    };

    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("linkedin_posting_time");
    if (saved) {
      setTimeout(() => {
        setPostingTime(saved);
      }, 0);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`✓ Copied ${label} to clipboard!`);
  };

  const handleSaveSchedule = () => {
    localStorage.setItem("linkedin_posting_time", postingTime);
    showToast(`✓ Daily posting time set to ${postingTime} PKT (${cronExpression})`);
  };

  const checkHealth = async () => {
    setIsPinging(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setHealthStatus("Operational (HTTP 200)");
        showToast("✓ Health Check Passed: Bridge is active!");
      } else {
        setHealthStatus("Warning");
      }
    } catch {
      setHealthStatus("Unreachable");
      showToast("⚠ Could not reach health endpoint");
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.badgeRow}>
            <span className={styles.brandBadge}>
              <span className={styles.statusDot}></span>
              Live Production
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Vercel Cron • Publora API • OpenAI DALL-E 3
            </span>
          </div>
          <h1 className={styles.title}>LinkedIn AI Automation Hub</h1>
          <p className={styles.subtitle}>
            Control center for scheduling and publishing automated daily visual articles to LinkedIn.
          </p>
        </div>

        {/* Live World Clocks */}
        <div className={styles.clockCard}>
          <div className={styles.clockItem}>
            <span className={styles.clockLabel}>Pakistan (PKT / UTC+5)</span>
            <span className={styles.clockTime}>{karachiClock || "Loading..."}</span>
          </div>
          <div className={styles.clockDivider} />
          <div className={styles.clockItem}>
            <span className={styles.clockLabel}>Vercel (UTC)</span>
            <span className={styles.clockTime}>{utcClock || "Loading..."}</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Scheduler & System Stats */}
      <div className={styles.grid}>
        {/* Scheduler Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>⏰ Daily Schedule Manager</h2>
              <p className={styles.cardSub}>
                Set the target local time when your LinkedIn post publishes every day.
              </p>
            </div>
          </div>

          {/* Time Picker Control */}
          <div className={styles.timePickerRow}>
            <div className={styles.timeInputWrapper}>
              <span style={{ fontSize: "1.2rem" }}>🕒</span>
              <input
                type="time"
                className={styles.timeInput}
                value={postingTime}
                onChange={(e) => setPostingTime(e.target.value)}
              />
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                PKT (Asia/Karachi)
              </span>
            </div>

            {/* Presets */}
            <div className={styles.presetsRow}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.time}
                  onClick={() => setPostingTime(preset.time)}
                  className={`${styles.presetBtn} ${
                    postingTime === preset.time ? styles.presetBtnActive : ""
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Cron Banner */}
          <div className={styles.cronBanner}>
            <div className={styles.cronRow}>
              <span className={styles.cronLabel}>Equivalent UTC Invocations:</span>
              <span style={{ fontWeight: 700, color: "#f8fafc", fontSize: "0.95rem" }}>
                {utcTimeStr}
              </span>
            </div>
            <div className={styles.cronRow}>
              <span className={styles.cronLabel}>Vercel Cron Expression:</span>
              <div className={styles.cronExprWrapper}>
                <code className={styles.cronCode}>{cronExpression}</code>
                <button
                  onClick={() => copyToClipboard(cronExpression, "Cron Expression")}
                  className={styles.copyBtn}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSaveSchedule} className={styles.saveBtn}>
            <span>💾 Save Schedule Preference</span>
          </button>
        </div>

        {/* System & Architecture Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>⚡ Bridge & Service Status</h2>
              <p className={styles.cardSub}>Active architecture endpoints and integrations.</p>
            </div>
          </div>

          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span className={styles.statKey}>Timezone Anchor</span>
              <span className={styles.statVal}>Asia/Karachi (UTC+5)</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statKey}>Daily Posting Cadence</span>
              <span className={styles.statVal}>1 Post + 1 AI Image / Day</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statKey}>Duplicate Protection</span>
              <span className={styles.statVal} style={{ color: "#10b981" }}>
                Active (Idempotent)
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statKey}>Cron Endpoint</span>
              <span className={styles.statVal} style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                /api/cron/daily
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statKey}>System Health</span>
              <span
                className={styles.statVal}
                style={{ color: healthStatus?.includes("200") ? "#10b981" : "var(--text-primary)" }}
              >
                {healthStatus || "Ready to Ping"}
              </span>
            </div>
          </div>

          <button onClick={checkHealth} disabled={isPinging} className={styles.actionBtn}>
            <span>{isPinging ? "Checking..." : "🩺 Ping /api/health"}</span>
          </button>
        </div>
      </div>

      {/* Weekly Content Calendar Section */}
      <section className={styles.calendarSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📅 Weekly Content Calendar</h2>
          <p className={styles.sectionSub}>
            Automated topic rotation. Each day produces unique technical commentary accompanied by a high-resolution landscape AI visual.
          </p>
        </div>

        <div className={styles.calendarGrid}>
          {Object.entries(WEEKLY_CONTENT_CALENDAR).map(([day, category]) => {
            const isToday = day.toLowerCase() === todayWeekday.toLowerCase();
            return (
              <div
                key={day}
                className={`${styles.dayCard} ${isToday ? styles.todayCard : ""}`}
              >
                {isToday && <span className={styles.todayBadge}>Active Today</span>}
                <div className={styles.dayHeader}>
                  <span className={styles.dayIcon}>{DAY_ICONS[day] || "📝"}</span>
                  <span className={styles.dayName}>{day}</span>
                </div>
                <div className={styles.dayCategory}>{category}</div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  {DAY_TOPICS[day]}
                </p>
                <div className={styles.daySpecs}>
                  <span className={styles.specPill}>120-220 words</span>
                  <span className={styles.specPill}>1792×1024 AI Visual</span>
                  <span className={styles.specPill}>3-5 Hashtags</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Actions & Deployment Info Bar */}
      <footer className={styles.actionsBar}>
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>🚀 Connected Production Deployment</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            GitHub: <a href="https://github.com/aliayyoub580-cmd/linkedin-automation" target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>aliayyoub580-cmd/linkedin-automation</a>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a
            href="https://vercel.com/aliayyoub580-cmds-projects/linkedin-automation"
            target="_blank"
            rel="noreferrer"
            className={styles.actionBtn}
          >
            Vercel Dashboard ↗
          </a>
          <a
            href="https://linkedin-automation-red.vercel.app/api/health"
            target="_blank"
            rel="noreferrer"
            className={styles.actionBtn}
          >
            Open Live Health API ↗
          </a>
        </div>
      </footer>
    </div>
  );
}

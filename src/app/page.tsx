"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { WEEKLY_CONTENT_CALENDAR } from "@/lib/calendar";

const REQUIRED_SCHEDULE_PASSWORD = "Atif.123";

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

interface LatestPostData {
  postGroupId?: string;
  status?: string;
  createdAt?: string;
  content?: string;
  postedId?: string;
  linkedinUrl?: string;
  mediaUrl?: string;
}

export default function Home() {
  const [postingTime, setPostingTime] = useState<string>("08:00");
  const [pendingTime, setPendingTime] = useState<string>("08:00");
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"schedule" | "publish_now">("schedule");
  const [isPublishingNow, setIsPublishingNow] = useState<boolean>(false);

  const [toast, setToast] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [karachiClock, setKarachiClock] = useState<string>("");
  const [utcClock, setUtcClock] = useState<string>("");
  const [todayWeekday, setTodayWeekday] = useState<string>("");

  const [latestPost, setLatestPost] = useState<LatestPostData | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState<boolean>(false);

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

  // Fetch latest published post on load
  const fetchLatestPost = async () => {
    setIsLoadingPost(true);
    try {
      const res = await fetch("/api/posts/latest");
      const data = await res.json();
      if (res.ok && data.success && data.hasPost) {
        setLatestPost(data.post);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingPost(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/posts/latest")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.success && data?.hasPost) {
          setLatestPost(data.post);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("linkedin_posting_time");
    if (saved) {
      setTimeout(() => {
        setPostingTime(saved);
        setPendingTime(saved);
      }, 0);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`✓ Copied ${label} to clipboard!`);
  };

  // Schedule change request - triggers password verification
  const handleRequestTimeChange = (newTime: string) => {
    if (newTime === postingTime) return;
    setPendingTime(newTime);
    setModalMode("schedule");
    setPasswordInput("");
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleRequestPublishNow = () => {
    setModalMode("publish_now");
    setPasswordInput("");
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput !== REQUIRED_SCHEDULE_PASSWORD) {
      setPasswordError("Incorrect password. Access denied.");
      return;
    }

    if (modalMode === "schedule") {
      setPostingTime(pendingTime);
      localStorage.setItem("linkedin_posting_time", pendingTime);
      setShowPasswordModal(false);
      setPasswordInput("");
      setPasswordError(null);
      showToast(`✓ Password verified! Daily posting time updated to ${pendingTime} PKT.`);
    } else if (modalMode === "publish_now") {
      setShowPasswordModal(false);
      setPasswordInput("");
      setPasswordError(null);
      setIsPublishingNow(true);
      showToast("⏳ Generating & publishing today's LinkedIn post...");

      try {
        const res = await fetch("/api/cron/daily?force=true", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REQUIRED_SCHEDULE_PASSWORD}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast("✓ Success! Today's LinkedIn post has been scheduled & published!");
          setTimeout(() => {
            fetchLatestPost();
          }, 2000);
        } else {
          showToast(`⚠ Publishing error: ${data.error || "Failed to publish"}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error";
        showToast(`⚠ Network error: ${msg}`);
      } finally {
        setIsPublishingNow(false);
      }
    }
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

      {/* Password Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>🔒 Password Required</h3>
              <p className={styles.modalSub}>
                {modalMode === "schedule" ? (
                  <>
                    Enter the administrator password to change the daily posting schedule time to <strong>{pendingTime} PKT</strong>.
                  </>
                ) : (
                  <>
                    Enter the administrator password to generate and publish today&apos;s LinkedIn post immediately.
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleVerifyPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                type="password"
                className={styles.passwordInput}
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                autoFocus
              />

              {passwordError && (
                <span style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>
                  {passwordError}
                </span>
              )}

              <div className={styles.modalActions}>
                <button type="submit" className={styles.confirmBtn} disabled={isPublishingNow}>
                  {modalMode === "schedule" ? "Unlock & Update" : "Publish Now"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Latest Published LinkedIn Post Showcase */}
      {latestPost && (
        <div className={styles.postBanner}>
          <div className={styles.postBannerHeader}>
            <div className={styles.postBannerTitle}>
              <span>📢 Latest Published LinkedIn Post</span>
              <span className={styles.liveBadge}>
                <span className={styles.statusDot}></span>
                Published
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={fetchLatestPost}
                disabled={isLoadingPost}
                className={styles.copyBtn}
              >
                {isLoadingPost ? "Refreshing..." : "🔄 Refresh Status"}
              </button>
              {latestPost.linkedinUrl && (
                <a
                  href={latestPost.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.linkedinBtn}
                >
                  <span>🔗 View Post on LinkedIn ↗</span>
                </a>
              )}
            </div>
          </div>

          <div className={styles.postBannerBody}>
            {latestPost.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latestPost.mediaUrl}
                alt="Published post thumbnail"
                className={styles.postThumb}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100px",
                  background: "rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-muted)",
                  fontSize: "1.5rem",
                }}
              >
                🖼️
              </div>
            )}

            <div className={styles.postContentArea}>
              <p className={styles.postText}>{latestPost.content || "Post content unavailable."}</p>
              <div className={styles.postMetaRow}>
                {latestPost.createdAt && (
                  <span>
                    📅 Published:{" "}
                    <strong>
                      {new Date(latestPost.createdAt).toLocaleString("en-US", {
                        timeZone: "Asia/Karachi",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      PKT
                    </strong>
                  </span>
                )}
                {latestPost.postedId && (
                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ID: {latestPost.postedId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Scheduler & System Stats */}
      <div className={styles.grid}>
        {/* Scheduler Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>⏰ Daily Schedule Manager</h2>
              <p className={styles.cardSub}>
                Set the target local time when your LinkedIn post publishes every day (Password Protected: <code>Atif.123</code>).
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
                value={pendingTime}
                onChange={(e) => setPendingTime(e.target.value)}
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
                  onClick={() => handleRequestTimeChange(preset.time)}
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
              <span className={styles.cronLabel}>Active Schedule Time (PKT):</span>
              <span style={{ fontWeight: 700, color: "#38bdf8", fontSize: "1rem" }}>
                {postingTime} PKT
              </span>
            </div>
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

          {/* Save Button with Password Protection */}
          <button
            onClick={() => handleRequestTimeChange(pendingTime)}
            className={styles.saveBtn}
          >
            <span>🔒 Save Schedule Preference (Requires Password)</span>
          </button>

          {/* Immediate Publish Button */}
          <button
            onClick={handleRequestPublishNow}
            disabled={isPublishingNow}
            className={styles.publishNowBtn}
          >
            <span>{isPublishingNow ? "⏳ Publishing Post to LinkedIn..." : "🚀 Publish Today's Post Now"}</span>
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

                    import { useEffect, useState } from "react";
                    import "./trophies-badges.css";

                    export default function TrophiesBadges() {
                      const [filter, setFilter] = useState("all");
                      const [modal, setModal] = useState({ open: false, icon: "", title: "", desc: "" });

                      const openModal = (icon: string, title: string, desc: string) => setModal({ open: true, icon, title, desc });
                      const closeModal = () => setModal({ open: false, icon: "", title: "", desc: "" });

                      useEffect(() => {
                        const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
                        window.addEventListener("keydown", onKey);
                        return () => window.removeEventListener("keydown", onKey);
                      }, []);

                      return (
                        <div className="container">
                          <div className="header" />

                          {/* Trophies */}
                          <div className="trophies-section">
                            <h2 className="section-title">🏆 Trophies</h2>
                            <p className="section-subtitle">
                              The most prestigious awards recognizing exceptional season-long achievements
                            </p>

                            <div className="trophies-grid">
                              {/* UYP Legacy Trophies */}
                              <div className="trophy-subsection">
                                <h3 className="subsection-title">🌟 UYP Legacy Trophies (Yearly)</h3>
                                <p className="subsection-description">
                                  Premier organization-wide honors - only one recipient selected from all UYP teams
                                </p>

                                <div className="trophy-cards-grid">
                                  <div
                                    className="trophy-card legacy-trophy"
                                    onClick={() =>
                                      openModal(
                                        "❤️‍🔥",
                                        "The UYP Heart and Hustle Award",
                                        "The ultimate recognition of effort and determination! This yearly award goes to the single player across all of UYP who most consistently gave their all, demonstrating exceptional effort and determination in every practice and game. This is the highest honor for work ethic in the entire organization."
                                      )
                                    }
                                  >
                                    <div className="trophy-icon-container">
                                      <div className="trophy-icon">❤️‍🔥</div>
                                      <div className="trophy-status">Not Awarded</div>
                                    </div>
                                    <div className="trophy-title">The UYP Heart and Hustle Award</div>
                                    <div className="trophy-description">
                                      Organization&apos;s highest honor for effort and determination
                                    </div>
                                  </div>

                                  <div
                                    className="trophy-card legacy-trophy"
                                    onClick={() =>
                                      openModal(
                                        "✨",
                                        "The Spirit Award",
                                        "The pinnacle of character recognition! Awarded to the one player across the entire UYP organization who best maintained a positive attitude, lifted team morale, and represented the character of UYP both on and off the court. This award recognizes the player who embodies the true spirit of basketball."
                                      )
                                    }
                                  >
                                    <div className="trophy-icon-container">
                                      <div className="trophy-icon">✨</div>
                                      <div className="trophy-status">Not Awarded</div>
                                    </div>
                                    <div className="trophy-title">The Spirit Award</div>
                                    <div className="trophy-description">Highest character honor across entire organization</div>
                                  </div>
                                </div>
                              </div>

                              {/* Team Trophies */}
                              <div className="trophy-subsection">
                                <h3 className="subsection-title">🏅 Team Trophies (Seasonal)</h3>
                                <p className="subsection-description">Coach-awarded recognition for standout team contributions</p>

                                <div className="trophy-cards-grid">
                                  <div
                                    className="trophy-card team-trophy achieved"
                                    onClick={() =>
                                      openModal(
                                        "👑",
                                        "MVP (Most Valuable Player)",
                                        "Outstanding season achievement! You were awarded MVP by your coach for having the most significant impact on the team's success during the season. Your contributions were essential to the team's performance and achievements."
                                      )
                                    }
                                  >
                                    <div className="trophy-icon-container">
                                      <div className="trophy-icon">👑</div>
                                      <div className="trophy-status awarded">2023 Season</div>
                                    </div>
                                    <div className="trophy-title">MVP (Most Valuable Player)</div>
                                    <div className="trophy-description">Most significant impact on team&apos;s success</div>
                                  </div>

                                  <div
                                    className="trophy-card team-trophy"
                                    onClick={() =>
                                      openModal(
                                        "🎖️",
                                        "Coach's Award",
                                        "The coach's highest recognition! This award goes to the player who best exemplifies the team's core values and the coach's philosophy, demonstrating exceptional coachability, dedication, and a positive attitude throughout the entire season."
                                      )
                                    }
                                  >
                                    <div className="trophy-icon-container">
                                      <div className="trophy-icon">🎖️</div>
                                      <div className="trophy-status">Not Awarded</div>
                                    </div>
                                    <div className="trophy-title">Coach&apos;s Award</div>
                                    <div className="trophy-description">Exemplifies team values and coach&apos;s philosophy</div>
                                  </div>

                                  <div
                                    className="trophy-card team-trophy achieved"
                                    onClick={() =>
                                      openModal(
                                        "📈",
                                        "MIP (Most Improved Player)",
                                        "Incredible growth recognition! You were awarded Most Improved Player by your coach for showing the most significant development in skills and game sense over the course of the season. Your dedication to improvement was truly exceptional."
                                      )
                                    }
                                  >
                                    <div className="trophy-icon-container">
                                      <div className="trophy-icon">📈</div>
                                      <div className="trophy-status awarded">2022 Season</div>
                                    </div>
                                    <div className="trophy-title">MIP (Most Improved Player)</div>
                                    <div className="trophy-description">Most significant growth and development</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="badges-section">
                            <h2 className="section-title">🏅 Badges</h2>
                            <p className="section-subtitle">
                              Earn badges by reaching milestones and demonstrating excellence in various areas
                            </p>

                            <div className="stats-bar">
                              {[
                                ["all", "Total", "100"],
                                ["completed", "Completed", "57"],
                                ["in-progress", "In Progress", "43"],
                                ["hall-of-fame", "Hall of Fame", "7"],
                                ["superstar", "Superstar", "9"],
                                ["all-star", "All-Star", "12"],
                                ["starter", "Starter", "14"],
                                ["prospect", "Prospect", "15"],
                              ].map(([key, label, num]) => (
                                <div
                                  key={key}
                                  className={`stat-item filter-btn ${filter === key ? "active" : ""}`}
                                  onClick={() => setFilter(key)}
                                >
                                  <span className="stat-number">{num}</span>
                                  <span className="stat-label">{label}</span>
                                </div>
                              ))}
                            </div>

                            {/* data-filter is used by CSS to dim/hide non-matching cards */}
                            <div className="achievements-grid" data-filter={filter}>
                              {/* HALL OF FAME */}
                              <div
                                className="achievement-card hall-of-fame achieved"
                                onClick={() =>
                                  openModal(
                                    "⭐",
                                    "Superstar",
                                    "Elite achievement! You have demonstrated a consistent pattern of dominance by earning 10 MVP awards. Your exceptional skill and leadership set you apart from all others."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">⭐</div>
                                  <div className="progress-indicator completed">10/10</div>
                                </div>
                                <div className="achievement-title">Superstar</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame"
                                onClick={() =>
                                  openModal(
                                    "🌟",
                                    "Prime Time",
                                    "You are known for delivering in the biggest moments! Earn 10 Clutch awards to prove you can perform when it matters most."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🌟</div>
                                  <div className="progress-indicator">7/10</div>
                                </div>
                                <div className="achievement-title">Prime Time</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame"
                                onClick={() =>
                                  openModal(
                                    "💪",
                                    "Force of Will",
                                    "Your unbreakable spirit refuses to lose! Earn 10 Comeback awards to show your incredible resilience and determination."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">💪</div>
                                  <div className="progress-indicator">4/10</div>
                                </div>
                                <div className="achievement-title">Force of Will</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame achieved"
                                onClick={() =>
                                  openModal(
                                    "🔋",
                                    "Relentless",
                                    "Your motor never stops! You have earned 10 Hustle awards, proving your incredible work ethic and determination on every play."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🔋</div>
                                  <div className="progress-indicator completed">10/10</div>
                                </div>
                                <div className="achievement-title">Relentless</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame"
                                onClick={() =>
                                  openModal(
                                    "🔗",
                                    "The Linchpin",
                                    "You are absolutely essential to team cohesion! Earn 10 Teammate awards to prove your vital role in bringing everyone together."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🔗</div>
                                  <div className="progress-indicator">6/10</div>
                                </div>
                                <div className="achievement-title">The Linchpin</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame achieved"
                                onClick={() =>
                                  openModal(
                                    "🏅",
                                    "Spirit of the Game",
                                    "You embody the highest ideals of fair play! Your 10 Sportsmanship awards show your commitment to playing the game the right way."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🏅</div>
                                  <div className="progress-indicator completed">10/10</div>
                                </div>
                                <div className="achievement-title">Spirit of the Game</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame"
                                onClick={() =>
                                  openModal(
                                    "🧠",
                                    "Coach on the Court",
                                    "You understand the game on a deeper, strategic level! Earn 10 Student awards to show your basketball IQ and dedication to learning."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🧠</div>
                                  <div className="progress-indicator">8/10</div>
                                </div>
                                <div className="achievement-title">Coach on the Court</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame"
                                onClick={() =>
                                  openModal(
                                    "👑",
                                    "The Paragon",
                                    "You are the ultimate embodiment of how to prepare and play! Earn 10 Lead by Example awards to achieve this prestigious status."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">👑</div>
                                  <div className="progress-indicator">5/10</div>
                                </div>
                                <div className="achievement-title">The Paragon</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame achieved"
                                onClick={() =>
                                  openModal(
                                    "🎖️",
                                    "Coach's Choice",
                                    "Outstanding achievement! You have earned each of the eight core coach awards at least once, showing your well-rounded excellence in all aspects of the game."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🎖️</div>
                                  <div className="progress-indicator completed">8/8</div>
                                </div>
                                <div className="achievement-title">Coach&apos;s Choice</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame"
                                onClick={() =>
                                  openModal(
                                    "🎯",
                                    "The Trifecta",
                                    "Incredible season performance! Earn an MVP, Hustle, and Teammate award all in the same season to achieve this rare combination."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🎯</div>
                                  <div className="progress-indicator">2/3</div>
                                </div>
                                <div className="achievement-title">The Trifecta</div>
                              </div>

                              <div
                                className="achievement-card hall-of-fame achieved"
                                onClick={() =>
                                  openModal(
                                    "🛡️",
                                    "Character Captain",
                                    "Exemplary character! You earned Hustle, Teammate, and Sportsmanship awards in the same season, showing your commitment to doing things the right way."
                                  )
                                }
                              >
                                <div className="icon-container">
                                  <div className="achievement-icon">🛡️</div>
                                  <div className="progress-indicator completed">3/3</div>
                                </div>
                                <div className="achievement-title">Character Captain</div>
                              </div>

                              {/* ...all the remaining Superstar / All-Star / Starter / Prospect cards from your HTML...
                                  Keep the same classNames (e.g., "superstar", "all-star", "starter", "prospect")
                                  and add onClick={() => openModal(icon, title, `description`)} for each.
                                  For brevity, I didn't paste the entire block again, but your content can be
                                  copied over 1:1 as JSX (only change: use onClick + backticks for strings). */}
                            </div>
                          </div>

                          {/* Modal */}
                          {modal.open && (
                            <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                              <div className="modal-content">
                                <div className="modal-icon">{modal.icon}</div>
                                <div className="modal-title">{modal.title}</div>
                                <div className="modal-description">{modal.desc}</div>
                                <button className="close-modal" onClick={closeModal}>
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

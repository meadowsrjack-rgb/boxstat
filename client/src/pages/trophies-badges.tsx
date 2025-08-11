<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Achievement Gallery</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#fff; min-height:100vh; padding:2rem; }
    .container { max-width:1200px; margin:0 auto; }
    .header { text-align:center; margin-bottom:3rem; }
    .header h1 { color:#2c3e50; font-size:3rem; font-weight:700; margin-bottom:.5rem; }
    .header p { color:#7f8c8d; font-size:1.2rem; }

    .achievements-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:2rem; margin-bottom:3rem; }
    .achievement-card { background:rgba(255,255,255,.95); border-radius:20px; padding:2rem; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.2); transition:.3s; cursor:pointer; position:relative; overflow:hidden; }
    .achievement-card:hover { transform:translateY(-10px); box-shadow:0 20px 40px rgba(0,0,0,.3); }
    .achievement-card.achieved { background:#d82428; color:#fff; }
    .achievement-card.hall-of-fame { border:3px solid #ffd700; background:linear-gradient(135deg,#fff9c4 0%,#f7e98e 100%); }
    .achievement-card.hall-of-fame.achieved { background:linear-gradient(135deg,#ffd700 0%,#ffb347 100%); color:#2c3e50; border:3px solid #ffb347; }
    .achievement-card.achieved::before { content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:linear-gradient(45deg,transparent,rgba(255,255,255,.3),transparent); transform:rotate(45deg); animation:shine 2s infinite; }
    @keyframes shine { 0%{transform:translateX(-100%) translateY(-100%) rotate(45deg);} 50%{transform:translateX(100%) translateY(100%) rotate(45deg);} 100%{transform:translateX(-100%) translateY(-100%) rotate(45deg);} }

    .icon-container { position:relative; display:inline-block; margin-bottom:1rem; }
    .achievement-icon { font-size:2.5rem; margin-bottom:.5rem; filter:drop-shadow(0 4px 8px rgba(0,0,0,.2)); }
    .achievement-card:not(.achieved) .achievement-icon { opacity:.4; filter:grayscale(100%) drop-shadow(0 4px 8px rgba(0,0,0,.2)); }
    .progress-ring { position:absolute; top:-10px; left:-10px; width:calc(100% + 20px); height:calc(100% + 20px); border-radius:50%; }
    .progress-indicator { position:absolute; top:-5px; right:-5px; background:#e74c3c; color:#fff; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,.3); }
    .progress-indicator.completed { background:#27ae60; }

    .achievement-title { font-size:1.3rem; font-weight:600; color:#2c3e50; margin-bottom:.5rem; }
    .achievement-card.achieved .achievement-title { color:#fff; }
    .achievement-card.hall-of-fame.achieved .achievement-title { color:#2c3e50; }
    .achievement-description { display:none; }
    .achievement-card.achieved .achievement-description { color:rgba(255,255,255,.9); }
    .achievement-card.hall-of-fame.achieved .achievement-description { color:#2c3e50; }

    .achievement-card.superstar { border:3px solid #8e44ad; background:linear-gradient(135deg,#e8d5f2 0%,#d1a3e0 100%); }
    .achievement-card.superstar.achieved { background:linear-gradient(135deg,#8e44ad 0%,#9b59b6 100%); color:#fff; border:3px solid #9b59b6; }
    .achievement-card.superstar.achieved .achievement-title { color:#fff; }
    .achievement-card.superstar.achieved .achievement-description { color:rgba(255,255,255,.9); }

    .achievement-card.all-star { border:3px solid #3498db; background:linear-gradient(135deg,#e3f2fd 0%,#bbdefb 100%); }
    .achievement-card.all-star.achieved { background:linear-gradient(135deg,#3498db 0%,#2980b9 100%); color:#fff; border:3px solid #2980b9; }
    .achievement-card.all-star.achieved .achievement-title { color:#fff; }
    .achievement-card.all-star.achieved .achievement-description { color:rgba(255,255,255,.9); }

    .achievement-card.starter { border:3px solid #27ae60; background:linear-gradient(135deg,#e8f5e8 0%,#c8e6c9 100%); }
    .achievement-card.starter.achieved { background:linear-gradient(135deg,#27ae60 0%,#2ecc71 100%); color:#fff; border:3px solid #2ecc71; }
    .achievement-card.starter.achieved .achievement-title { color:#fff; }
    .achievement-card.starter.achieved .achievement-description { color:rgba(255,255,255,.9); }

    .achievement-card.prospect { border:3px solid #95a5a6; background:linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%); }
    .achievement-card.prospect.achieved { background:linear-gradient(135deg,#95a5a6 0%,#7f8c8d 100%); color:#fff; border:3px solid #7f8c8d; }
    .achievement-card.prospect.achieved .achievement-title { color:#fff; }
    .achievement-card.prospect.achieved .achievement-description { color:rgba(255,255,255,.9); }

    .trophies-section { margin-bottom:4rem; }
    .badges-section { margin-bottom:3rem; }
    .section-title { font-size:2.5rem; color:#2c3e50; text-align:center; margin-bottom:.5rem; font-weight:700; }
    .section-subtitle { text-align:center; color:#7f8c8d; font-size:1.1rem; margin-bottom:2rem; }

    .trophies-grid { display:flex; flex-direction:column; gap:3rem; }
    .trophy-subsection { background:rgba(255,255,255,.95); border-radius:20px; padding:2rem; box-shadow:0 10px 30px rgba(0,0,0,.2); }
    .subsection-title { font-size:1.8rem; color:#2c3e50; margin-bottom:.5rem; font-weight:600; text-align:center; }
    .subsection-description { text-align:center; color:#7f8c8d; font-size:1rem; margin-bottom:2rem; font-style:italic; }

    .trophy-cards-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1.5rem; }
    .trophy-card { background:rgba(255,255,255,.95); border-radius:15px; padding:1.5rem; text-align:center; box-shadow:0 8px 20px rgba(0,0,0,.15); transition:.3s; cursor:pointer; position:relative; overflow:hidden; border:3px solid transparent; }
    .trophy-card:hover { transform:translateY(-10px); box-shadow:0 20px 40px rgba(0,0,0,.3); }
    .legacy-trophy { border:4px solid #ffd700; background:linear-gradient(135deg,#fff9c4 0%,#f7e98e 100%); }
    .legacy-trophy.achieved { background:linear-gradient(135deg,#ffd700 0%,#ffb347 100%); color:#2c3e50; }
    .team-trophy { border:4px solid #e74c3c; background:linear-gradient(135deg,#ffeaa7 0%,#fab1a0 100%); }
    .team-trophy.achieved { background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%); color:#fff; }
    .trophy-card.achieved::before { content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%; background:linear-gradient(45deg,transparent,rgba(255,255,255,.4),transparent); transform:rotate(45deg); animation:shine 3s infinite; }
    .trophy-icon-container { position:relative; display:inline-block; margin-bottom:1rem; }
    .trophy-icon { font-size:3rem; margin-bottom:.8rem; filter:drop-shadow(0 4px 8px rgba(0,0,0,.3)); }
    .trophy-card:not(.achieved) .trophy-icon { opacity:.5; filter:grayscale(100%) drop-shadow(0 4px 8px rgba(0,0,0,.3)); }
    .trophy-status { position:absolute; top:-10px; right:-10px; background:#95a5a6; color:#fff; border-radius:15px; padding:.3rem .8rem; font-size:.8rem; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,.3); }
    .trophy-status.awarded { background:#27ae60; }
    .trophy-title { font-size:1.1rem; font-weight:700; color:#2c3e50; margin-bottom:.4rem; }
    .trophy-card.achieved .trophy-title { color:#fff; }
    .legacy-trophy.achieved .trophy-title { color:#2c3e50; }
    .trophy-description { color:#7f8c8d; font-size:.85rem; line-height:1.3; font-weight:500; }
    .trophy-card.achieved .trophy-description { color:rgba(255,255,255,.9); }
    .legacy-trophy.achieved .trophy-description { color:#2c3e50; }

    .stats-bar { background:rgba(255,255,255,.95); border-radius:15px; padding:1.5rem; display:flex; justify-content:space-around; box-shadow:0 10px 30px rgba(0,0,0,.2); margin-bottom:2rem; }
    .stat-item { text-align:center; }
    .filter-btn { cursor:pointer; transition:.3s; border-radius:10px; padding:.5rem; }
    .filter-btn:hover { background:rgba(52,152,219,.1); transform:translateY(-2px); }
    .filter-btn.active { background:#3498db; color:#fff; }
    .filter-btn.active .stat-number, .filter-btn.active .stat-label { color:#fff; }
    .stat-number { font-size:1.5rem; font-weight:700; color:#2c3e50; display:block; }
    .stat-label { color:#7f8c8d; font-size:.75rem; text-transform:uppercase; letter-spacing:1px; }

    .modal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.8); z-index:1000; align-items:center; justify-content:center; }
    .modal-content { background:#fff; border-radius:20px; padding:2rem; max-width:500px; width:90%; text-align:center; position:relative; }
    .modal-icon { font-size:5rem; margin-bottom:1rem; }
    .modal-title { font-size:2rem; color:#2c3e50; margin-bottom:1rem; }
    .modal-description { color:#7f8c8d; line-height:1.6; margin-bottom:2rem; }
    .close-modal { background:#667eea; color:#fff; border:none; padding:.8rem 2rem; border-radius:25px; cursor:pointer; font-size:1rem; transition:background .3s; }
    .close-modal:hover { background:#5a6fd8; }

    @media (max-width:768px){
      .header h1{font-size:2rem;}
      .section-title{font-size:2rem;}
      .subsection-title{font-size:1.4rem;}
      .trophy-card{padding:1rem;}
      .trophy-icon{font-size:2.5rem;}
      .trophy-title{font-size:1rem;}
      .trophy-cards-grid{grid-template-columns:1fr; gap:1rem;}
      .trophy-subsection{padding:1.5rem;}
      .achievements-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem;}
      .achievement-card{padding:1.5rem;}
      .achievement-icon{font-size:2rem;}
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"></div>

    <!-- Trophies Section -->
    <div class="trophies-section">
      <h2 class="section-title">🏆 Trophies</h2>
      <p class="section-subtitle">The most prestigious awards recognizing exceptional season-long achievements</p>

      <div class="trophies-grid">
        <!-- UYP Legacy Trophies -->
        <div class="trophy-subsection">
          <h3 class="subsection-title">🌟 UYP Legacy Trophies (Yearly)</h3>
          <p class="subsection-description">Premier organization-wide honors - only one recipient selected from all UYP teams</p>

          <div class="trophy-cards-grid">
            <div class="trophy-card legacy-trophy" onclick="openModal('heart-hustle','❤️‍🔥','The UYP Heart and Hustle Award','The ultimate recognition of effort and determination! This yearly award goes to the single player across all of UYP who most consistently gave their all, demonstrating exceptional effort and determination in every practice and game. This is the highest honor for work ethic in the entire organization.')">
              <div class="trophy-icon-container">
                <div class="trophy-icon">❤️‍🔥</div>
                <div class="trophy-status">Not Awarded</div>
              </div>
              <div class="trophy-title">The UYP Heart and Hustle Award</div>
              <div class="trophy-description">Organization's highest honor for effort and determination</div>
            </div>

            <div class="trophy-card legacy-trophy" onclick="openModal('spirit-award','✨','The Spirit Award','The pinnacle of character recognition! Awarded to the one player across the entire UYP organization who best maintained a positive attitude, lifted team morale, and represented the character of UYP both on and off the court. This award recognizes the player who embodies the true spirit of basketball.')">
              <div class="trophy-icon-container">
                <div class="trophy-icon">✨</div>
                <div class="trophy-status">Not Awarded</div>
              </div>
              <div class="trophy-title">The Spirit Award</div>
              <div class="trophy-description">Highest character honor across entire organization</div>
            </div>
          </div>
        </div>

        <!-- Team Trophies -->
        <div class="trophy-subsection">
          <h3 class="subsection-title">🏅 Team Trophies (Seasonal)</h3>
          <p class="subsection-description">Coach-awarded recognition for standout team contributions</p>

          <div class="trophy-cards-grid">
            <div class="trophy-card team-trophy achieved" onclick="openModal('team-mvp','👑','MVP (Most Valuable Player)','Outstanding season achievement! You were awarded MVP by your coach for having the most significant impact on the team\'s success during the season. Your contributions were essential to the team\'s performance and achievements.')">
              <div class="trophy-icon-container">
                <div class="trophy-icon">👑</div>
                <div class="trophy-status awarded">2023 Season</div>
              </div>
              <div class="trophy-title">MVP (Most Valuable Player)</div>
              <div class="trophy-description">Most significant impact on team&apos;s success</div>
            </div>

            <div class="trophy-card team-trophy" onclick="openModal('coaches-award','🎖️','Coach\'s Award','The coach\'s highest recognition! This award goes to the player who best exemplifies the team\'s core values and the coach\'s philosophy, demonstrating exceptional coachability, dedication, and a positive attitude throughout the entire season.')">
              <div class="trophy-icon-container">
                <div class="trophy-icon">🎖️</div>
                <div class="trophy-status">Not Awarded</div>
              </div>
              <div class="trophy-title">Coach&apos;s Award</div>
              <div class="trophy-description">Exemplifies team values and coach&apos;s philosophy</div>
            </div>

            <div class="trophy-card team-trophy achieved" onclick="openModal('mip-trophy','📈','MIP (Most Improved Player)','Incredible growth recognition! You were awarded Most Improved Player by your coach for showing the most significant development in skills and game sense over the course of the season. Your dedication to improvement was truly exceptional.')">
              <div class="trophy-icon-container">
                <div class="trophy-icon">📈</div>
                <div class="trophy-status awarded">2022 Season</div>
              </div>
              <div class="trophy-title">MIP (Most Improved Player)</div>
              <div class="trophy-description">Most significant growth and development</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Badges Section -->
    <div class="badges-section">
      <h2 class="section-title">🏅 Badges</h2>
      <p class="section-subtitle">Earn badges by reaching milestones and demonstrating excellence in various areas</p>

      <div class="stats-bar">
        <div class="stat-item filter-btn" data-filter="all" onclick="filterBadges('all')">
          <span class="stat-number">100</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item filter-btn" data-filter="completed" onclick="filterBadges('completed')">
          <span class="stat-number">57</span>
          <span class="stat-label">Completed</span>
        </div>
        <div class="stat-item filter-btn" data-filter="in-progress" onclick="filterBadges('in-progress')">
          <span class="stat-number">43</span>
          <span class="stat-label">In Progress</span>
        </div>
        <div class="stat-item filter-btn" data-filter="hall-of-fame" onclick="filterBadges('hall-of-fame')">
          <span class="stat-number">7</span>
          <span class="stat-label">Hall of Fame</span>
        </div>
        <div class="stat-item filter-btn" data-filter="superstar" onclick="filterBadges('superstar')">
          <span class="stat-number">9</span>
          <span class="stat-label">Superstar</span>
        </div>
        <div class="stat-item filter-btn" data-filter="all-star" onclick="filterBadges('all-star')">
          <span class="stat-number">12</span>
          <span class="stat-label">All-Star</span>
        </div>
        <div class="stat-item filter-btn" data-filter="starter" onclick="filterBadges('starter')">
          <span class="stat-number">14</span>
          <span class="stat-label">Starter</span>
        </div>
        <div class="stat-item filter-btn" data-filter="prospect" onclick="filterBadges('prospect')">
          <span class="stat-number">15</span>
          <span class="stat-label">Prospect</span>
        </div>
      </div>

      <div class="achievements-grid">
        <!-- Hall of Famer Badges -->
        <div class="achievement-card hall-of-fame achieved" onclick="openModal('superstar','⭐','Superstar','Elite achievement! You have demonstrated a consistent pattern of dominance by earning 10 MVP awards. Your exceptional skill and leadership set you apart from all others.')">
          <div class="icon-container">
            <div class="achievement-icon">⭐</div>
            <div class="progress-indicator completed">10/10</div>
          </div>
          <div class="achievement-title">Superstar</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('prime-time','🌟','Prime Time','You are known for delivering in the biggest moments! Earn 10 Clutch awards to prove you can perform when it matters most.')">
          <div class="icon-container">
            <div class="achievement-icon">🌟</div>
            <div class="progress-indicator">7/10</div>
          </div>
          <div class="achievement-title">Prime Time</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('force-of-will','💪','Force of Will','Your unbreakable spirit refuses to lose! Earn 10 Comeback awards to show your incredible resilience and determination.')">
          <div class="icon-container">
            <div class="achievement-icon">💪</div>
            <div class="progress-indicator">4/10</div>
          </div>
          <div class="achievement-title">Force of Will</div>
        </div>

        <div class="achievement-card hall-of-fame achieved" onclick="openModal('relentless','🔋','Relentless','Your motor never stops! You have earned 10 Hustle awards, proving your incredible work ethic and determination on every play.')">
          <div class="icon-container">
            <div class="achievement-icon">🔋</div>
            <div class="progress-indicator completed">10/10</div>
          </div>
          <div class="achievement-title">Relentless</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('linchpin','🔗','The Linchpin','You are absolutely essential to team cohesion! Earn 10 Teammate awards to prove your vital role in bringing everyone together.')">
          <div class="icon-container">
            <div class="achievement-icon">🔗</div>
            <div class="progress-indicator">6/10</div>
          </div>
          <div class="achievement-title">The Linchpin</div>
        </div>

        <div class="achievement-card hall-of-fame achieved" onclick="openModal('spirit-of-game','🏅','Spirit of the Game','You embody the highest ideals of fair play! Your 10 Sportsmanship awards show your commitment to playing the game the right way.')">
          <div class="icon-container">
            <div class="achievement-icon">🏅</div>
            <div class="progress-indicator completed">10/10</div>
          </div>
          <div class="achievement-title">Spirit of the Game</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('coach-on-court','🧠','Coach on the Court','You understand the game on a deeper, strategic level! Earn 10 Student awards to show your basketball IQ and dedication to learning.')">
          <div class="icon-container">
            <div class="achievement-icon">🧠</div>
            <div class="progress-indicator">8/10</div>
          </div>
          <div class="achievement-title">Coach on the Court</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('paragon','👑','The Paragon','You are the ultimate embodiment of how to prepare and play! Earn 10 Lead by Example awards to achieve this prestigious status.')">
          <div class="icon-container">
            <div class="achievement-icon">👑</div>
            <div class="progress-indicator">5/10</div>
          </div>
          <div class="achievement-title">The Paragon</div>
        </div>

        <div class="achievement-card hall-of-fame achieved" onclick="openModal('coaches-choice','🎖️','Coach\'s Choice','Outstanding achievement! You have earned each of the eight core coach awards at least once, showing your well-rounded excellence in all aspects of the game.')">
          <div class="icon-container">
            <div class="achievement-icon">🎖️</div>
            <div class="progress-indicator completed">8/8</div>
          </div>
          <div class="achievement-title">Coach&apos;s Choice</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('trifecta','🎯','The Trifecta','Incredible season performance! Earn an MVP, Hustle, and Teammate award all in the same season to achieve this rare combination.')">
          <div class="icon-container">
            <div class="achievement-icon">🎯</div>
            <div class="progress-indicator">2/3</div>
          </div>
          <div class="achievement-title">The Trifecta</div>
        </div>

        <div class="achievement-card hall-of-fame achieved" onclick="openModal('character-captain','🛡️','Character Captain','Exemplary character! You earned Hustle, Teammate, and Sportsmanship awards in the same season, showing your commitment to doing things the right way.')">
          <div class="icon-container">
            <div class="achievement-icon">🛡️</div>
            <div class="progress-indicator completed">3/3</div>
          </div>
          <div class="achievement-title">Character Captain</div>
        </div>

        <div class="achievement-card hall-of-fame" onclick="openModal('practice-legend','🏃‍♂️','Practice Legend','Incredible dedication! You are working towards attending 250 total team practices, showing your commitment to improvement and team success.')">
          <div

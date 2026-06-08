const revealElements = document.querySelectorAll(".reveal");
const timelineItems = document.querySelectorAll(".timeline-item");
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
const cursorGlow = document.querySelector(".cursor-glow");
const themeToggle = document.getElementById("themeToggle");
const langButtons = document.querySelectorAll(".lang-btn");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  },
  { threshold: 0.12 }
);

revealElements.forEach((element) => revealObserver.observe(element));

const timelineObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.15 }
);

timelineItems.forEach((element) => timelineObserver.observe(element));

menuBtn?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("active");
  menuBtn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("active");
    menuBtn?.setAttribute("aria-label", "Open menu");
  });
});

window.addEventListener(
  "mousemove",
  (event) => {
    if (!cursorGlow) return;
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top  = `${event.clientY}px`;
  },
  { passive: true }
);

/* ─────────────────────────────────────────────────────────────
   PROFILE CARD — 3D MOUSE PARALLAX
   Spring physics: lerp toward target, animate on RAF,
   spring-return on mouseleave. Respects prefers-reduced-motion.
───────────────────────────────────────────────────────────── */
(function initProfileParallax() {
  const card   = document.getElementById("profileCard");
  if (!card) return;

  // Respect prefers-reduced-motion
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  // Parallax layers inside the card
  const layers = card.querySelectorAll("[data-parallax-layer]");

  // Config
  const MAX_TILT    = 10;   // degrees max tilt on X/Y
  const LAYER_SHIFT = 10;   // px max translate for layer=1.0
  const LERP_ENTER  = 0.09; // smoothing while hovering
  const LERP_LEAVE  = 0.06; // smoothing while returning

  // State
  let targetRX = 0, targetRY = 0; // target rotation
  let currentRX = 2, currentRY = 0; // current (starts at slight tilt)
  let isHovering = false;
  let rafId = null;
  let isMobile = window.innerWidth < 768;

  window.addEventListener("resize", () => {
    isMobile = window.innerWidth < 768;
  }, { passive: true });

  // ── Shadow depth response ──
  function updateShadow(rx, ry) {
    const lift = Math.abs(rx) + Math.abs(ry);
    const spread = 40 + lift * 2;
    const blur   = 80 + lift * 3;
    card.style.boxShadow = [
      "0 2px 0 0 rgba(255,255,255,0.06) inset",
      "0 -1px 0 0 rgba(0,0,0,0.3) inset",
      `0 ${spread}px ${blur}px rgba(0,0,0,${0.45 + lift * 0.01})`,
      "0 12px 32px rgba(0,0,0,0.35)",
      "0 0 0 1px rgba(255,255,255,0.04)"
    ].join(", ");
  }

  // ── Apply transforms ──
  function applyTransform(rx, ry) {
    // Card base rotation
    card.style.transform =
      `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    card.style.transition = "none";

    // Layer parallax
    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.parallaxLayer) || 0.5;
      const tx = (-ry / MAX_TILT) * LAYER_SHIFT * depth;
      const ty = ( rx / MAX_TILT) * LAYER_SHIFT * depth;
      layer.style.transform  = `translate(${tx}px, ${ty}px)`;
      layer.style.transition = "none";
    });

    updateShadow(rx, ry);
  }

  // ── RAF loop ──
  function tick() {
    const lerpFactor = isHovering ? LERP_ENTER : LERP_LEAVE;

    currentRX += (targetRX - currentRX) * lerpFactor;
    currentRY += (targetRY - currentRY) * lerpFactor;

    applyTransform(currentRX, currentRY);

    // Stop when close enough (spring settled)
    const settled =
      Math.abs(currentRX - targetRX) < 0.01 &&
      Math.abs(currentRY - targetRY) < 0.01;

    if (!settled) {
      rafId = requestAnimationFrame(tick);
    } else {
      currentRX = targetRX;
      currentRY = targetRY;
      applyTransform(targetRX, targetRY);
      rafId = null;
    }
  }

  function startLoop() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  // ── Mouse enter card ──
  card.addEventListener("mouseenter", () => {
    if (isMobile) return;
    isHovering = true;
    // Remove spring transition — JS drives it
    card.style.transition = "box-shadow 0.4s ease";
    startLoop();
  });

  // ── Mouse move over card ──
  card.addEventListener("mousemove", (e) => {
    if (isMobile) return;

    const rect = card.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;

    // Normalized -1 to +1
    const nx = (e.clientX - cx) / (rect.width  / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);

    // rotateX tilts on vertical axis (inverted for natural feel)
    targetRY =  nx * MAX_TILT;
    targetRX = -ny * MAX_TILT;

    startLoop();
  });

  // ── Mouse leave card — spring back to rest ──
  card.addEventListener("mouseleave", () => {
    if (isMobile) return;
    isHovering = false;
    targetRX   = 0;
    targetRY   = 2; // restore original slight tilt
    card.style.transition = "box-shadow 0.8s cubic-bezier(0.23,1,0.32,1)";
    startLoop();

    // Reset layer transforms with CSS spring
    layers.forEach((layer) => {
      layer.style.transition = "transform 0.8s cubic-bezier(0.23,1,0.32,1)";
      layer.style.transform  = "translate(0,0)";
    });
  });
})();

const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

themeToggle?.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", nextTheme);
  localStorage.setItem("theme", nextTheme);
  themeToggle.textContent = nextTheme === "dark" ? "☀️" : "🌙";
});

const baseContent = {
  nav_story: "Story",
  nav_skills: "Skills",
  nav_journey: "Journey",
  nav_learning: "Learning",
  nav_beyond: "Beyond",
  nav_projects: "Projects",
  nav_contact: "Contact",
  hero_eyebrow: "Front-end Developer • Learner • Builder",
  hero_title_1: "I build digital things with",
  hero_title_2: "clarity, taste & code.",
  hero_text:
    "I’m Rafayel Martirosyan — an Armenian front-end developer focused on clean interfaces, responsive layouts, Figma-to-code work, and continuous growth in software engineering.",
  hero_btn_story: "Explore My Story",
  hero_btn_projects: "See Projects",
  stat_1: "Years in Web",
  stat_2: "English & Russian",
  stat_3: "Software Engineering",
  profile_role: "Front-end Web Developer",
  terminal_cmd_1: "whoami",
  terminal_cmd_2: "direction",
  terminal_cmd_3: "status",
  terminal_1: "Developer who learns by building.",
  terminal_2: "Interfaces, systems, real projects.",
  terminal_3: "Always improving.",
  story_label: "Personal Story",
  story_title: "A short story about where I’m going",
  story_p1:
    "My path in IT started with curiosity and turned into a real direction. I learned how websites are structured, how interfaces are built, and how small visual details can change the whole feeling of a product.",
  story_p2:
    "I work with front-end technologies, transform designs into responsive pages, and keep improving my understanding of software engineering. My goal is not only to write code, but to build things that feel clean, useful, and alive.",
  story_p3:
    "I’m currently studying Software for Computer Engineering and Automated Systems, while also expanding my practical skills through academies, online courses, real projects, and daily practice.",
  philosophy_label: "Philosophy",
  philosophy_title: "How I think about interfaces",
  philosophy_text:
    "I believe good interfaces are not just beautiful — they are clear, fast, and easy to use.",
  skills_label: "What I Use",
  skills_title: "Skills & Tools",
  skill_1_title: "Core Front-end",
  skill_1_text:
    "HTML5, CSS3, JavaScript ES6+, responsive UI, animations, clean layouts.",
  skill_2_title: "UI Implementation",
  skill_2_text:
    "Figma-to-code, pixel care, Bootstrap 5, reusable sections, mobile-first design.",
  skill_3_title: "Development Tools",
  skill_3_text:
    "Git, GitHub, VS Code, Chrome DevTools, code review workflow.",
  skill_4_title: "Expanding Stack",
  skill_4_text:
    "React basics, PHP, MySQL, WordPress, Python bots, C / Arduino basics.",
  skill_5_title: "Networking & Systems",
  skill_5_text:
    "Cisco Packet Tracer, network topology design, basic routing & switching, Linux shell scripting.",
  skill_6_title: "Vibe Coding & AI Tools",
  skill_6_text:
    "AI-assisted development workflow, prompt engineering, building real projects using Claude, ChatGPT, and GitHub Copilot.",
  journey_label: "Experience Timeline",
  journey_title: "Work & Growth Journey",
  period_1: "2022 — 2023",
  period_2: "2023 — 2024",
  period_current: "Current",
  period_next: "Next",
  exp_1_title: "Junior Web Developer",
  exp_1_text:
    "Converted Figma designs into responsive HTML/CSS pages, improved layouts, and built user-friendly web interfaces.",
  exp_2_title: "Front-end Web Developer",
  exp_2_text:
    "Worked with remote teams, used GitHub pull requests, reviewed code, and focused on cleaner, reusable front-end structure.",
  exp_3_title: "Building Real Projects",
  exp_3_text:
    "Developing practical web projects and Python-based Telegram bot logic, combining UI, automation, and real user needs.",
  exp_4_title: "Deeper Software Engineering",
  exp_4_text:
    "Moving step by step toward stronger engineering fundamentals, better architecture, and more serious product-level development.",
  education_label: "Learning Path",
  education_title: "Education & Academies",
  edu_1_title: "Kotayk Regional State College",
  edu_1_text: "Software for Computer Engineering and Automated Systems",
  edu_1_meta: "2023 — 2027",
  edu_2_text:
    "Computer systems, Linux, C programming, memory, processes, networking basics and shell project.",
  edu_2_meta: "System Programming Path",
  edu_3_text: "Web Development, Graphic Design and technical creative learning.",
  edu_3_meta: "Creative + Technical Base",
  edu_4_text: "Arduino & C Programming",
  edu_4_meta: "Hardware + Logic",
  beyond_label: "Beyond Code",
  beyond_title: "Achievements & Human Skills",
  beyond_1_title: "🏅 Clean Games — Winner",
  beyond_1_text:
    'Winner of the "Clean Games" competition — a civic initiative promoting integrity, fair play, and ethical behavior among youth.',
  beyond_1_meta: "Civic Achievement",
  beyond_2_title: "🤝 Volunteering",
  beyond_2_text:
    "Active volunteer in multiple community and educational initiatives, contributing time and skills to meaningful local causes.",
  beyond_2_meta: "Community Impact",
  beyond_3_title: "🏆 Olympiad Participant",
  beyond_3_text:
    "Participated in various academic olympiads, demonstrating competitive problem-solving and commitment to academic excellence.",
  beyond_3_meta: "Academic Excellence",
  beyond_4_title: "🌐 Customer Communication",
  beyond_4_text:
    "Professional customer-facing experience at Marriott — strong interpersonal, multilingual service, and problem-solving skills.",
  beyond_4_meta: "Marriott Experience",
  cert_label: "Certificates",
  cert_title: "Certifications & Courses",
  cert_1: "JavaScript Fundamentals — freeCodeCamp",
  cert_2: "Responsive Web Design — freeCodeCamp",
  cert_3: "Git & GitHub — Coursera",
  cert_4: "Bootstrap 5 — Udemy",
  cert_5: "HTML/CSS — TestDome",
  cert_6: "HTML5 — StudySection",
  cert_7: "Software Testing Basics — Udemy",
  cert_8: "Arduino & C Programming",
  cert_9: "PH International - Access Program",
  language_label: "Communication",
  language_title: "Languages",
  lang_arm: "Armenian",
  lang_eng: "English",
  lang_rus: "Russian",
  lang_native: "Native",
  lang_advanced: "C1 / Advanced",
  projects_label: "Selected Work",
  projects_title: "Projects & Ideas",
  project_1_title: "Meeting Scheduler",
  project_2_title: "MoneyMind",
  project_3_title: "Latin to Armenian",
  project_4_title: "Numbers",
  project_5_title: "BarberShop Website",
  project_6_title: "Telegram Bot for Group Orders",
  project_1_text:
    "A clean web tool for organizing meetings and scheduling time more easily.",
  project_2_text:
    "A finance-focused project for tracking money, planning and building better habits.",
  project_3_text:
    "A useful converter for transforming Latin-written Armenian into Armenian script.",
  project_4_text:
    "A small practical web project connected with numbers, logic and interaction.",
  project_5_text:
    "A stylish landing page concept for a barbershop with visual presentation and structure.",
  project_6_text:
    "A Python-based Telegram bot idea for collecting product links, user data and grouped orders.",
  open_project: "Open Project →",
  in_progress: "In Progress →",
  contact_label: "Contact",
  contact_title: "Let’s connect",
  contact_text:
    "Whether it’s a project, collaboration, or just a conversation about tech, I’m open to meaningful connections.",
  footer_text:
    "© 2026 Rafayel Martirosyan — Built with HTML, CSS & JavaScript."
};

const translations = {
  en: baseContent,
  hy: {
    nav_story: "Իմ ուղին",
    nav_skills: "Հմտություններ",
    nav_journey: "Փորձ",
    nav_learning: "Ուսուցում",
    nav_beyond: "Ավելին",
    nav_projects: "Նախագծեր",
    nav_contact: "Կապ",
    hero_eyebrow: "Front-end ծրագրավորող • Սովորող • Ստեղծող",
    hero_title_1: "Ստեղծում եմ թվային լուծումներ",
    hero_title_2: "պարզությամբ, ճաշակով և կոդով",
    hero_text:
      "Ես Ռաֆայել Մարտիրոսյանն եմ՝ հայ front-end ծրագրավորող, կենտրոնացած մաքուր ինտերֆեյսների, responsive դասավորությունների, Figma-ից կոդ աշխատանքի և ծրագրային ճարտարագիտության մեջ շարունակական աճի վրա։",
    hero_btn_story: "Բացահայտել իմ պատմությունը",
    hero_btn_projects: "Տեսնել նախագծերը",
    stat_1: "Տարի վեբ ոլորտում",
    stat_2: "Անգլերեն և ռուսերեն",
    stat_3: "Ծրագրային ճարտարագիտություն",
    profile_role: "Front-end վեբ ծրագրավորող",
    terminal_cmd_1: "ով_եմ_ես",
    terminal_cmd_2: "ուղղություն",
    terminal_cmd_3: "կարգավիճակ",
    terminal_1: "Ծրագրավորող, ով սովորում է ստեղծելով։",
    terminal_2: "Ինտերֆեյսներ, համակարգեր, իրական նախագծեր։",
    terminal_3: "Միշտ զարգանում եմ։",
    story_label: "Անձնական պատմություն",
    story_title: "Կարճ պատմություն այն մասին, թե ուր եմ գնում",
    story_p1:
      "Իմ ճանապարհը IT-ում սկսվեց հետաքրքրասիրությունից և դարձավ իրական ուղղություն։ Ես սովորեցի, թե ինչպես են կառուցվում կայքերը, ինչպես են ստեղծվում ինտերֆեյսները, և ինչպես կարող են փոքր վիզուալ դետալները փոխել ամբողջ արտադրանքի զգացողությունը։",
    story_p2:
      "Աշխատում եմ front-end տեխնոլոգիաներով, դիզայնները վերածում responsive էջերի և շարունակում խորացնել ծրագրային ճարտարագիտության իմ ընկալումը։ Իմ նպատակը միայն կոդ գրել չէ, այլ ստեղծել մաքուր, օգտակար և կենդանի զգացողությամբ լուծումներ։",
    story_p3:
      "Այժմ սովորում եմ «Հաշվողական տեխնիկայի և ավտոմատացված համակարգերի ծրագրային ապահովում» մասնագիտությամբ՝ միաժամանակ զարգացնելով գործնական հմտություններս ակադեմիաների, առցանց դասընթացների, իրական նախագծերի և ամենօրյա աշխատանքի միջոցով։",
    philosophy_label: "Փիլիսոփայություն",
    philosophy_title: "Ինչպես եմ մտածում ինտերֆեյսների մասին",
    philosophy_text:
      "Ես հավատում եմ, որ լավ ինտերֆեյսները միայն գեղեցիկ չեն․ դրանք պարզ են, արագ և հեշտ օգտագործվող։",
    skills_label: "Ինչ եմ օգտագործում",
    skills_title: "Հմտություններ և գործիքներ",
    skill_1_title: "Հիմնական front-end",
    skill_1_text:
      "HTML5, CSS3, JavaScript ES6+, responsive UI, անիմացիաներ, մաքուր դասավորություններ։",
    skill_2_title: "UI իրականացում",
    skill_2_text:
      "Figma-ից կոդ, pixel care, Bootstrap 5, կրկնօգտագործվող բաժիններ, mobile-first դիզայն։",
    skill_3_title: "Զարգացման գործիքներ",
    skill_3_text:
      "Git, GitHub, VS Code, Chrome DevTools, code review աշխատանքային ընթացք։",
    skill_4_title: "Զարգացող stack",
    skill_4_text:
      "React հիմունքներ, PHP, MySQL, WordPress, Python բոտեր, C / Arduino հիմունքներ։",
    skill_5_title: "Ցանցեր և համակարգեր",
    skill_5_text:
      "Cisco Packet Tracer, ցանցային topology, routing և switching հիմունքներ, Linux shell scripting։",
    skill_6_title: "Vibe Coding և AI գործիքներ",
    skill_6_text:
      "AI-ով ծրագրավորման workflow, prompt engineering, իրական նախագծեր Claude, ChatGPT և GitHub Copilot-ով։",
    journey_label: "Փորձի ժամանակագիծ",
    journey_title: "Աշխատանքի և աճի ճանապարհ",
    period_1: "2022 — 2023",
    period_2: "2023 — 2024",
    period_current: "Ներկայում",
    period_next: "Հաջորդ քայլ",
    exp_1_title: "Junior Web Developer",
    exp_1_text:
      "Figma դիզայնները վերածել եմ responsive HTML/CSS էջերի, բարելավել դասավորությունները և ստեղծել օգտագործողի համար հարմար վեբ ինտերֆեյսներ։",
    exp_2_title: "Front-end Web Developer",
    exp_2_text:
      "Աշխատել եմ հեռավար թիմերի հետ, օգտագործել GitHub pull request-ներ, վերանայել կոդը և կենտրոնացել ավելի մաքուր ու կրկնօգտագործվող front-end կառուցվածքի վրա։",
    exp_3_title: "Իրական նախագծերի ստեղծում",
    exp_3_text:
      "Ստեղծում եմ գործնական վեբ նախագծեր և Python-ով Telegram bot տրամաբանություն՝ միավորելով UI-ն, ավտոմատացումը և իրական օգտատերերի կարիքները։",
    exp_4_title: "Ավելի խոր ծրագրային ճարտարագիտություն",
    exp_4_text:
      "Քայլ առ քայլ շարժվում եմ դեպի ավելի ուժեղ ինժեներական հիմքեր, ավելի լավ ճարտարապետություն և արտադրանքային մակարդակի զարգացում։",
    education_label: "Ուսումնական ուղի",
    education_title: "Կրթություն և ակադեմիաներ",
    edu_1_title: "Կոտայքի տարածաշրջանային պետական քոլեջ",
    edu_1_text:
      "Հաշվողական տեխնիկայի և ավտոմատացված համակարգերի ծրագրային ապահովում",
    edu_1_meta: "2023 — 2027",
    edu_2_text:
      "Համակարգչային համակարգեր, Linux, C ծրագրավորում, հիշողություն, պրոցեսներ, ցանցերի հիմունքներ և shell նախագիծ։",
    edu_2_meta: "System Programming ուղղություն",
    edu_3_text: "Վեբ ծրագրավորում, գրաֆիկական դիզայն և տեխնիկական ստեղծարար ուսուցում։",
    edu_3_meta: "Ստեղծարար + տեխնիկական հիմք",
    edu_4_text: "Arduino և C ծրագրավորում",
    edu_4_meta: "Hardware + տրամաբանություն",
    beyond_label: "Կոդից դուրս",
    beyond_title: "Նվաճումներ և մարդկային հմտություններ",
    beyond_1_title: "🏅 Մաքուր խաղեր — հաղթող",
    beyond_1_text:
      "«Մաքուր Խաղեր» մրցույթի հաղթող — քաղաքացիական նախաձեռնություն, որը խթանում է ազնվությունը, արդար խաղը և բարոյական վարքը երիտասարդների շրջանում։",
    beyond_1_meta: "Քաղաքացիական նվաճում",
    beyond_2_title: "🤝 Կամավորություն",
    beyond_2_text:
      "Ակտիվ կամավոր բազմաթիվ համայնքային և կրթական նախաձեռնություններում՝ ժամանակ ու հմտություններ ներդնելով կարևոր տեղական նախագծերում։",
    beyond_2_meta: "Հասարակական ազդեցություն",
    beyond_3_title: "🏆 Օլիմպիադաների մասնակից",
    beyond_3_text:
      "Մասնակցել եմ տարբեր ակադեմիական օլիմպիադաների՝ ցուցաբերելով մրցակցային խնդիրներ լուծելու կարողություն և ակադեմիական գերազանցության հանձնառություն։",
    beyond_3_meta: "Ակադեմիական գերազանցություն",
    beyond_4_title: "🌐 Հաճախորդների հետ հաղորդակցություն",
    beyond_4_text:
      "Հաճախորդների հետ աշխատելու փորձ Marriott-ում — ուժեղ միջանձնային, բազմալեզու սպասարկման և խնդիրներ լուծելու հմտություններ։",
    beyond_4_meta: "Marriott փորձ",
    cert_label: "Վկայականներ",
    cert_title: "Վկայականներ և դասընթացներ",
    cert_1: "JavaScript-ի հիմունքներ — freeCodeCamp",
    cert_2: "Responsive Web Design — freeCodeCamp",
    cert_3: "Git և GitHub — Coursera",
    cert_4: "Bootstrap 5 — Udemy",
    cert_5: "HTML/CSS — TestDome",
    cert_6: "HTML5 — StudySection",
    cert_7: "Software Testing-ի հիմունքներ — Udemy",
    cert_8: "Arduino և C ծրագրավորում",
    cert_9: "PH International - Access Program",
    language_label: "Հաղորդակցություն",
    language_title: "Լեզուներ",
    lang_arm: "Հայերեն",
    lang_eng: "Անգլերեն",
    lang_rus: "Ռուսերեն",
    lang_native: "Մայրենի",
    lang_advanced: "C1 / առաջադեմ",
    projects_label: "Ընտրված աշխատանքներ",
    projects_title: "Նախագծեր և գաղափարներ",
    project_1_title: "Հանդիպումների պլանավորիչ",
    project_2_title: "MoneyMind",
    project_3_title: "Լատինատառից հայերեն",
    project_4_title: "Թվեր",
    project_5_title: "BarberShop կայք",
    project_6_title: "Telegram bot խմբային պատվերների համար",
    project_1_text:
      "Մաքուր վեբ գործիք հանդիպումներ կազմակերպելու և ժամանակը ավելի հեշտ պլանավորելու համար։",
    project_2_text:
      "Ֆինանսական նախագիծ գումարը հետևելու, պլանավորելու և ավելի լավ սովորություններ ձևավորելու համար։",
    project_3_text:
      "Օգտակար փոխարկիչ՝ լատինատառ հայերենը հայերեն գրի վերածելու համար։",
    project_4_text:
      "Փոքր գործնական վեբ նախագիծ՝ կապված թվերի, տրամաբանության և ինտերակցիայի հետ։",
    project_5_text:
      "Ոճային landing page գաղափար barbershop-ի համար՝ վիզուալ ներկայացմամբ և կառուցվածքով։",
    project_6_text:
      "Python-ով Telegram bot գաղափար՝ ապրանքի հղումներ, օգտատիրոջ տվյալներ և խմբային պատվերներ հավաքելու համար։",
    open_project: "Բացել նախագիծը →",
    in_progress: "Ընթացքի մեջ →",
    contact_label: "Կապ",
    contact_title: "Կապ հաստատենք",
    contact_text:
      "Եթե կա նախագիծ, համագործակցություն կամ պարզապես զրույց տեխնոլոգիաների մասին, բաց եմ արժեքավոր կապերի համար։",
    footer_text:
      "© 2026 Ռաֆայել Մարտիրոսյան — Կառուցված է HTML, CSS և JavaScript-ով։"
  },
  ru: {
    nav_story: "История",
    nav_skills: "Навыки",
    nav_journey: "Путь",
    nav_learning: "Обучение",
    nav_beyond: "О себе",
    nav_projects: "Проекты",
    nav_contact: "Контакты",
    hero_eyebrow: "Front-end разработчик • Ученик • Создатель",
    hero_title_1: "Создаю цифровые вещи",
    hero_title_2: "с ясностью, вкусом и кодом.",
    hero_text:
      "Я Рафаэль Мартиросян — армянский front-end разработчик, сосредоточенный на чистых интерфейсах, адаптивной верстке, работе Figma-to-code и постоянном росте в программной инженерии.",
    hero_btn_story: "Моя история",
    hero_btn_projects: "Смотреть проекты",
    stat_1: "Года в вебе",
    stat_2: "Английский и русский",
    stat_3: "Программная инженерия",
    profile_role: "Front-end веб-разработчик",
    terminal_cmd_1: "кто_я",
    terminal_cmd_2: "направление",
    terminal_cmd_3: "статус",
    terminal_1: "Разработчик, который учится через создание.",
    terminal_2: "Интерфейсы, системы, реальные проекты.",
    terminal_3: "Постоянно улучшаюсь.",
    story_label: "Личная история",
    story_title: "Короткая история о том, куда я двигаюсь",
    story_p1:
      "Мой путь в IT начался с любопытства и превратился в настоящее направление. Я изучил, как устроены сайты, как создаются интерфейсы и как маленькие визуальные детали меняют ощущение всего продукта.",
    story_p2:
      "Я работаю с front-end технологиями, превращаю дизайны в адаптивные страницы и продолжаю углублять понимание программной инженерии. Моя цель — не просто писать код, а создавать чистые, полезные и живые решения.",
    story_p3:
      "Сейчас я изучаю программное обеспечение для вычислительной техники и автоматизированных систем, параллельно развивая практические навыки через академии, онлайн-курсы, реальные проекты и ежедневную практику.",
    philosophy_label: "Философия",
    philosophy_title: "Как я думаю об интерфейсах",
    philosophy_text:
      "Я верю, что хорошие интерфейсы не только красивы — они понятные, быстрые и удобные.",
    skills_label: "Что я использую",
    skills_title: "Навыки и инструменты",
    skill_1_title: "Базовый front-end",
    skill_1_text:
      "HTML5, CSS3, JavaScript ES6+, адаптивный UI, анимации, чистые layouts.",
    skill_2_title: "Реализация UI",
    skill_2_text:
      "Figma-to-code, внимание к пикселям, Bootstrap 5, повторяемые секции, mobile-first дизайн.",
    skill_3_title: "Инструменты разработки",
    skill_3_text:
      "Git, GitHub, VS Code, Chrome DevTools, процесс code review.",
    skill_4_title: "Расширяющийся стек",
    skill_4_text:
      "Основы React, PHP, MySQL, WordPress, Python-боты, основы C / Arduino.",
    skill_5_title: "Сети и системы",
    skill_5_text:
      "Cisco Packet Tracer, проектирование сетевых топологий, основы маршрутизации и коммутации, Linux shell.",
    skill_6_title: "Vibe Coding и AI инструменты",
    skill_6_text:
      "Разработка с помощью AI, prompt engineering, реальные проекты с Claude, ChatGPT и GitHub Copilot.",
    journey_label: "Таймлайн опыта",
    journey_title: "Работа и развитие",
    period_1: "2022 — 2023",
    period_2: "2023 — 2024",
    period_current: "Сейчас",
    period_next: "Следующий шаг",
    exp_1_title: "Junior Web Developer",
    exp_1_text:
      "Превращал Figma-дизайны в адаптивные HTML/CSS страницы, улучшал верстку и создавал удобные веб-интерфейсы.",
    exp_2_title: "Front-end Web Developer",
    exp_2_text:
      "Работал с удаленными командами, использовал pull requests на GitHub, проверял код и фокусировался на более чистой, переиспользуемой front-end структуре.",
    exp_3_title: "Создание реальных проектов",
    exp_3_text:
      "Разрабатываю практические веб-проекты и логику Telegram-ботов на Python, объединяя UI, автоматизацию и реальные потребности пользователей.",
    exp_4_title: "Глубже в программную инженерию",
    exp_4_text:
      "Шаг за шагом двигаюсь к более сильным инженерным основам, лучшей архитектуре и продуктовой разработке.",
    education_label: "Путь обучения",
    education_title: "Образование и академии",
    edu_1_title: "Котайкский региональный государственный колледж",
    edu_1_text:
      "Программное обеспечение для вычислительной техники и автоматизированных систем",
    edu_1_meta: "2023 — 2027",
    edu_2_text:
      "Компьютерные системы, Linux, программирование на C, память, процессы, основы сетей и shell-проект.",
    edu_2_meta: "Направление System Programming",
    edu_3_text: "Веб-разработка, графический дизайн и техническое творческое обучение.",
    edu_3_meta: "Творческая + техническая база",
    edu_4_text: "Arduino и программирование на C",
    edu_4_meta: "Hardware + логика",
    beyond_label: "За пределами кода",
    beyond_title: "Достижения и человеческие навыки",
    beyond_1_title: "🏅 Чистые игры — победитель",
    beyond_1_text:
      "Победитель конкурса «Чистые игры» — гражданская инициатива, продвигающая честность, fair play и этичное поведение среди молодёжи.",
    beyond_1_meta: "Гражданское достижение",
    beyond_2_title: "🤝 Волонтёрство",
    beyond_2_text:
      "Активный волонтёр в различных общественных и образовательных инициативах — вкладываю время и навыки в значимые местные проекты.",
    beyond_2_meta: "Общественное влияние",
    beyond_3_title: "🏆 Участник олимпиад",
    beyond_3_text:
      "Участвовал в различных академических олимпиадах, демонстрируя способность решать сложные задачи и стремление к академическому совершенству.",
    beyond_3_meta: "Академическое превосходство",
    beyond_4_title: "🌐 Работа с клиентами",
    beyond_4_text:
      "Профессиональный опыт работы с клиентами в Marriott — сильные межличностные, многоязычные и коммуникативные навыки.",
    beyond_4_meta: "Опыт в Marriott",
    cert_label: "Сертификаты",
    cert_title: "Сертификаты и курсы",
    cert_1: "Основы JavaScript — freeCodeCamp",
    cert_2: "Responsive Web Design — freeCodeCamp",
    cert_3: "Git и GitHub — Coursera",
    cert_4: "Bootstrap 5 — Udemy",
    cert_5: "HTML/CSS — TestDome",
    cert_6: "HTML5 — StudySection",
    cert_7: "Основы Software Testing — Udemy",
    cert_8: "Arduino и программирование на C",
    cert_9: "PH International - Access Program",
    language_label: "Коммуникация",
    language_title: "Языки",
    lang_arm: "Армянский",
    lang_eng: "Английский",
    lang_rus: "Русский",
    lang_native: "Родной",
    lang_advanced: "C1 / продвинутый",
    projects_label: "Избранные работы",
    projects_title: "Проекты и идеи",
    project_1_title: "Планировщик встреч",
    project_2_title: "MoneyMind",
    project_3_title: "С латиницы на армянский",
    project_4_title: "Числа",
    project_5_title: "Сайт BarberShop",
    project_6_title: "Telegram-бот для групповых заказов",
    project_1_text:
      "Чистый веб-инструмент для организации встреч и более удобного планирования времени.",
    project_2_text:
      "Финансовый проект для отслеживания денег, планирования и формирования лучших привычек.",
    project_3_text:
      "Полезный конвертер для преобразования армянского текста, написанного латиницей, в армянский алфавит.",
    project_4_text:
      "Небольшой практический веб-проект, связанный с числами, логикой и взаимодействием.",
    project_5_text:
      "Стильная landing page концепция для barbershop с визуальной презентацией и структурой.",
    project_6_text:
      "Идея Telegram-бота на Python для сбора ссылок на товары, данных пользователей и групповых заказов.",
    open_project: "Открыть проект →",
    in_progress: "В процессе →",
    contact_label: "Контакты",
    contact_title: "Давайте свяжемся",
    contact_text:
      "Будь то проект, сотрудничество или просто разговор о технологиях, я открыт к значимым контактам.",
    footer_text:
      "© 2026 Рафаэль Мартиросян — Сделано на HTML, CSS и JavaScript."
  },
  de: {
    nav_story: "Story",
    nav_skills: "Skills",
    nav_journey: "Weg",
    nav_learning: "Lernen",
    nav_beyond: "Mehr",
    nav_projects: "Projekte",
    nav_contact: "Kontakt",
    hero_eyebrow: "Front-end Entwickler • Lernender • Builder",
    hero_title_1: "Ich baue digitale Dinge",
    hero_title_2: "mit Klarheit, Stil und Code.",
    hero_text:
      "Ich bin Rafayel Martirosyan — ein armenischer Front-end Entwickler mit Fokus auf klare Interfaces, responsive Layouts, Figma-to-Code Arbeit und kontinuierliches Wachstum in Software Engineering.",
    hero_btn_story: "Meine Story",
    hero_btn_projects: "Projekte ansehen",
    stat_1: "Jahre im Web",
    stat_2: "Englisch und Russisch",
    stat_3: "Software Engineering",
    profile_role: "Front-end Webentwickler",
    terminal_cmd_1: "wer_bin_ich",
    terminal_cmd_2: "richtung",
    terminal_cmd_3: "status",
    terminal_1: "Entwickler, der durch Bauen lernt.",
    terminal_2: "Interfaces, Systeme, echte Projekte.",
    terminal_3: "Immer am Wachsen.",
    story_label: "Persönliche Story",
    story_title: "Eine kurze Story darüber, wohin ich gehe",
    story_p1:
      "Mein Weg in die IT begann mit Neugier und wurde zu einer echten Richtung. Ich lernte, wie Websites strukturiert sind, wie Interfaces entstehen und wie kleine visuelle Details das Gefühl eines ganzen Produkts verändern können.",
    story_p2:
      "Ich arbeite mit Front-end Technologien, verwandle Designs in responsive Seiten und vertiefe ständig mein Verständnis von Software Engineering. Mein Ziel ist nicht nur Code zu schreiben, sondern Dinge zu bauen, die sauber, nützlich und lebendig wirken.",
    story_p3:
      "Aktuell studiere ich Software für Computer Engineering und automatisierte Systeme und erweitere gleichzeitig meine praktischen Fähigkeiten durch Akademien, Online-Kurse, echte Projekte und tägliche Praxis.",
    philosophy_label: "Philosophie",
    philosophy_title: "Wie ich über Interfaces denke",
    philosophy_text:
      "Ich glaube, gute Interfaces sind nicht nur schön — sie sind klar, schnell und einfach zu benutzen.",
    skills_label: "Was ich nutze",
    skills_title: "Skills & Tools",
    skill_1_title: "Core Front-end",
    skill_1_text:
      "HTML5, CSS3, JavaScript ES6+, responsive UI, Animationen, saubere Layouts.",
    skill_2_title: "UI Umsetzung",
    skill_2_text:
      "Figma-to-Code, Pixelpflege, Bootstrap 5, wiederverwendbare Sektionen, Mobile-first Design.",
    skill_3_title: "Entwicklungstools",
    skill_3_text:
      "Git, GitHub, VS Code, Chrome DevTools, Code-Review Workflow.",
    skill_4_title: "Wachsender Stack",
    skill_4_text:
      "React Basics, PHP, MySQL, WordPress, Python Bots, C / Arduino Basics.",
    skill_5_title: "Netzwerke & Systeme",
    skill_5_text:
      "Cisco Packet Tracer, Netzwerktopologie, Routing & Switching Grundlagen, Linux Shell Scripting.",
    skill_6_title: "Vibe Coding & KI-Tools",
    skill_6_text:
      "KI-gestützte Entwicklung, Prompt Engineering, reale Projekte mit Claude, ChatGPT und GitHub Copilot.",
    journey_label: "Erfahrungs-Timeline",
    journey_title: "Arbeit & Wachstum",
    period_1: "2022 — 2023",
    period_2: "2023 — 2024",
    period_current: "Aktuell",
    period_next: "Nächster Schritt",
    exp_1_title: "Junior Web Developer",
    exp_1_text:
      "Figma-Designs in responsive HTML/CSS Seiten umgesetzt, Layouts verbessert und nutzerfreundliche Web-Interfaces gebaut.",
    exp_2_title: "Front-end Web Developer",
    exp_2_text:
      "Mit Remote-Teams gearbeitet, GitHub Pull Requests genutzt, Code geprüft und auf sauberere, wiederverwendbare Front-end Strukturen fokussiert.",
    exp_3_title: "Echte Projekte bauen",
    exp_3_text:
      "Ich entwickle praktische Webprojekte und Python-basierte Telegram-Bot Logik und verbinde UI, Automatisierung und echte Nutzerbedürfnisse.",
    exp_4_title: "Tieferes Software Engineering",
    exp_4_text:
      "Schritt für Schritt bewege ich mich zu stärkeren Engineering-Grundlagen, besserer Architektur und produktorientierter Entwicklung.",
    education_label: "Lernweg",
    education_title: "Bildung & Akademien",
    edu_1_title: "Kotayk Regional State College",
    edu_1_text:
      "Software für Computer Engineering und automatisierte Systeme",
    edu_1_meta: "2023 — 2027",
    edu_2_text:
      "Computersysteme, Linux, C Programmierung, Speicher, Prozesse, Netzwerkgrundlagen und Shell-Projekt.",
    edu_2_meta: "System Programming Pfad",
    edu_3_text: "Webentwicklung, Grafikdesign und technisch-kreatives Lernen.",
    edu_3_meta: "Kreative + technische Basis",
    edu_4_text: "Arduino & C Programmierung",
    edu_4_meta: "Hardware + Logik",
    beyond_label: "Jenseits des Codes",
    beyond_title: "Leistungen & menschliche Fähigkeiten",
    beyond_1_title: "🏅 Clean Games — Gewinner",
    beyond_1_text:
      "Gewinner des „Clean Games”-Wettbewerbs — eine zivilgesellschaftliche Initiative für Integrität, Fair Play und ethisches Verhalten unter Jugendlichen.",
    beyond_1_meta: "Bürgerliche Leistung",
    beyond_2_title: "🤝 Ehrenamt",
    beyond_2_text:
      "Aktiver Freiwilliger in mehreren Gemeinschafts- und Bildungsinitiativen — Zeit und Fähigkeiten für sinnvolle lokale Projekte eingesetzt.",
    beyond_2_meta: "Gesellschaftlicher Beitrag",
    beyond_3_title: "🏆 Olympiade-Teilnehmer",
    beyond_3_text:
      "Teilnahme an verschiedenen akademischen Olympiaden — Nachweis von Problemlösungskompetenz und Engagement für akademische Exzellenz.",
    beyond_3_meta: "Akademische Exzellenz",
    beyond_4_title: "🌐 Kundenkommunikation",
    beyond_4_text:
      "Berufserfahrung im Kundenkontakt bei Marriott — starke zwischenmenschliche, mehrsprachige Service- und Kommunikationsfähigkeiten.",
    beyond_4_meta: "Marriott-Erfahrung",
    cert_label: "Zertifikate",
    cert_title: "Zertifikate & Kurse",
    cert_1: "JavaScript Grundlagen — freeCodeCamp",
    cert_2: "Responsive Web Design — freeCodeCamp",
    cert_3: "Git & GitHub — Coursera",
    cert_4: "Bootstrap 5 — Udemy",
    cert_5: "HTML/CSS — TestDome",
    cert_6: "HTML5 — StudySection",
    cert_7: "Software Testing Basics — Udemy",
    cert_8: "Arduino & C Programmierung",
    cert_9: "PH International - Access Program",
    language_label: "Kommunikation",
    language_title: "Sprachen",
    lang_arm: "Armenisch",
    lang_eng: "Englisch",
    lang_rus: "Russisch",
    lang_native: "Muttersprache",
    lang_advanced: "C1 / Fortgeschritten",
    projects_label: "Ausgewählte Arbeiten",
    projects_title: "Projekte & Ideen",
    project_1_title: "Meeting Scheduler",
    project_2_title: "MoneyMind",
    project_3_title: "Lateinisch zu Armenisch",
    project_4_title: "Zahlen",
    project_5_title: "BarberShop Website",
    project_6_title: "Telegram Bot für Gruppenbestellungen",
    project_1_text:
      "Ein sauberes Webtool, um Meetings zu organisieren und Zeit einfacher zu planen.",
    project_2_text:
      "Ein finanzorientiertes Projekt zum Geldtracking, Planen und Aufbau besserer Gewohnheiten.",
    project_3_text:
      "Ein nützlicher Converter, der armenischen Text in lateinischer Schrift in armenische Schrift umwandelt.",
    project_4_text:
      "Ein kleines praktisches Webprojekt rund um Zahlen, Logik und Interaktion.",
    project_5_text:
      "Ein stilvolles Landing-Page Konzept für einen Barbershop mit visueller Präsentation und Struktur.",
    project_6_text:
      "Eine Python-basierte Telegram-Bot Idee zum Sammeln von Produktlinks, Nutzerdaten und Gruppenbestellungen.",
    open_project: "Projekt öffnen →",
    in_progress: "In Arbeit →",
    contact_label: "Kontakt",
    contact_title: "Lass uns verbinden",
    contact_text:
      "Ob Projekt, Zusammenarbeit oder einfach ein Gespräch über Tech: Ich bin offen für sinnvolle Kontakte.",
    footer_text:
      "© 2026 Rafayel Martirosyan — Gebaut mit HTML, CSS & JavaScript."
  }
};

function setLanguage(lang) {
  const activeLang = translations[lang] ? lang : "en";
  const dictionary = translations[activeLang];

  document.documentElement.lang = activeLang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = dictionary[key] || baseContent[key] || element.textContent;
  });

  langButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === activeLang);
  });

  localStorage.setItem("language", activeLang);
}

langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
});

setLanguage(localStorage.getItem("language") || "en");
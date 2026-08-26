"use client";

import { useEffect, useRef, useState } from "react";
import { youthProfiles } from "./profiles";
import { createYouthMusicEngine, type YouthMusicEngine } from "./youth-music";

const learningTracks = [
  {
    number: "01",
    title: "求真务实",
    english: "PRACTICE FIRST",
    copy: "摒弃虚功虚绩，把心放在基层，把事干在实处。",
  },
  {
    number: "02",
    title: "金融为民",
    english: "FINANCE FOR PEOPLE",
    copy: "立足金融本职，把服务发展、服务客户落到具体行动。",
  },
  {
    number: "03",
    title: "合规稳健",
    english: "STABLE & COMPLIANT",
    copy: "不以短期规模论英雄，以风险可控和资产质量检验成效。",
  },
  {
    number: "04",
    title: "久久为功",
    english: "LONG-TERM VALUE",
    copy: "做打基础、利长远的工作，在平凡岗位创造经得起检验的实绩。",
  },
];

const padNumber = (value: number) => String(value).padStart(2, "0");

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">("next");
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const musicEngine = useRef<YouthMusicEngine | null>(null);
  const musicWanted = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const activeProfile = youthProfiles[activeIndex];

  const stopMusic = () => {
    musicWanted.current = false;
    musicEngine.current?.pause();
    setIsMusicPlaying(false);
  };

  const startMusic = () => {
    musicWanted.current = true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      musicWanted.current = false;
      return;
    }

    const engine = musicEngine.current ?? createYouthMusicEngine(new AudioContextClass());
    musicEngine.current = engine;
    void engine.start().then((started) => {
      if (musicEngine.current !== engine || !musicWanted.current) {
        if (started) engine.pause();
        return;
      }
      setIsMusicPlaying(started);
    });
  };

  const toggleMusic = () => {
    // `musicWanted` can already be true while autoplay is still blocked by the
    // browser. Only treat the button as a pause action when audio is actually
    // running; otherwise this click is the user gesture that starts it.
    if (musicEngine.current?.isRunning) stopMusic();
    else startMusic();
  };

  useEffect(() => {
    // Try to autoplay as soon as the page opens. Browsers that block audio
    // without a user gesture keep the AudioContext suspended; the pending
    // start then resolves on the first interaction via the listeners below.
    startMusic();

    // Fallback: auto-start on the first interaction anywhere EXCEPT the music
    // toggle: the toggle's own click handler manages playback, and letting
    // both fire would start-then-stop the music within a single tap.
    const activateMusic = (event: Event) => {
      if (!musicWanted.current) return;
      if (event.target instanceof Element && event.target.closest(".music-toggle")) return;
      startMusic();
    };
    const syncMusicWithVisibility = () => {
      if (document.hidden) {
        if (musicWanted.current) {
          musicEngine.current?.pause();
          setIsMusicPlaying(false);
        }
      } else if (musicWanted.current) {
        startMusic();
      }
    };
    document.addEventListener("pointerdown", activateMusic, { once: true });
    document.addEventListener("keydown", activateMusic, { once: true });
    document.addEventListener("visibilitychange", syncMusicWithVisibility);

    return () => {
      document.removeEventListener("pointerdown", activateMusic);
      document.removeEventListener("keydown", activateMusic);
      document.removeEventListener("visibilitychange", syncMusicWithVisibility);
      musicWanted.current = false;
      musicEngine.current?.destroy();
      musicEngine.current = null;
    };
  }, []);

  const selectProfile = (index: number, direction?: "next" | "previous") => {
    const nextIndex = (index + youthProfiles.length) % youthProfiles.length;
    if (nextIndex === activeIndex) return;
    setSlideDirection(direction || (nextIndex > activeIndex ? "next" : "previous"));
    setDragOffset(0);
    setIsDragging(false);
    setActiveIndex(nextIndex);
  };

  const showPreviousProfile = () => selectProfile(activeIndex - 1, "previous");
  const showNextProfile = () => selectProfile(activeIndex + 1, "next");

  const scrollToProfiles = () => {
    document.getElementById("youth")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="page-shell">
      <button
        type="button"
        className={`music-toggle${isMusicPlaying ? " is-playing" : ""}`}
        onClick={toggleMusic}
        aria-label={isMusicPlaying ? "暂停轻音乐" : "播放轻音乐"}
        aria-pressed={isMusicPlaying}
      >
        <span className="music-disc" aria-hidden="true"><i /></span>
        <span className="music-label">{isMusicPlaying ? "音乐播放中" : "轻音乐"}</span>
      </button>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-rays" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <div className="hero-orbit hero-orbit-two" aria-hidden="true" />

        <header className="brand-bar">
          <a className="brand" href="#top" aria-label="返回页面顶部">
            <span className="brand-mark">
              <img src="./boc-logo.jpg" alt="" />
            </span>
            <span className="brand-copy">
              <strong>中国银行益阳分行</strong>
              <small>BANK OF CHINA · YIYANG BRANCH</small>
            </span>
          </a>
          <span className="column-seal">青年政绩观<br />主题专栏</span>
        </header>

        <div className="hero-content">
          <p className="hero-kicker"><span>BOC YOUTH</span> 政绩观主题专栏</p>
          <h1 id="hero-title">
            <span>青鉴实干</span>
            <em>青年政绩观主题专栏</em>
          </h1>
          <div className="hero-slogan">
            <span>以实干立身</span>
            <span>以实绩检验</span>
          </div>
          <p className="hero-intro">
            树立和践行正确政绩观，是青年履职尽责的必修课。立足金融本职重实干、求实效，
            把工作实绩落到服务发展、服务客户的具体行动之中。
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={scrollToProfiles}>
              开启青年实干志 <span aria-hidden="true">↓</span>
            </button>
            <div className="issue-count"><strong>{youthProfiles.length}</strong><span>YOUTH<br />VOICES</span></div>
          </div>
        </div>

        <div className="hero-footer">
          <span>THINK · PRACTICE · DELIVER</span>
          <span className="scroll-cue" aria-hidden="true"><i /></span>
        </div>
      </section>

      <nav className="chapter-nav" aria-label="页面章节导航">
        <a href="#mission">栏目导语</a>
        <a href="#tracks">观点要义</a>
        <a href="#youth">青年感悟</a>
      </nav>

      <section className="mission section-pad" id="mission">
        <div className="section-heading reveal-ready">
          <div>
            <p className="section-kicker">PRACTICE IN ACTION · 01</p>
            <h2>树立正确政绩观<br />践行金融为民</h2>
          </div>
          <span className="heading-stamp">实<br />干<br />效</span>
        </div>
        <div className="mission-layout">
          <p className="mission-lead">
            树立和践行正确政绩观，是青年履职尽责的必修课。
          </p>
          <p className="mission-copy">
            本栏目聚焦青年对政绩观的学习感悟与岗位实践思考，引导青年摒弃虚功虚绩，坚持求真务实，
            以党性立身做事，把工作实绩落到服务发展、服务客户的具体行动之中。
          </p>
        </div>
      </section>

      <section className="tracks section-pad" id="tracks" aria-labelledby="tracks-title">
        <div className="tracks-heading">
          <p className="section-kicker light">KNOWLEDGE TO PRACTICE · 02</p>
          <h2 id="tracks-title">四个关键词 · 一路实干</h2>
          <p>把正确政绩观落到每一次客户服务、每一笔业务办理和每一项风险防控中。</p>
        </div>
        <div className="track-grid">
          {learningTracks.map((track) => (
            <article className="track-card" key={track.number}>
              <div className="track-number">{track.number}</div>
              <div className="track-symbol" aria-hidden="true">{track.number === "01" ? "实" : track.number === "02" ? "民" : track.number === "03" ? "稳" : "久"}</div>
              <p>{track.english}</p>
              <h3>{track.title}</h3>
              <span>{track.copy}</span>
            </article>
          ))}
        </div>
      </section>

      <aside className="quote-band" aria-label="栏目寄语">
        <span className="quote-mark" aria-hidden="true">“</span>
        <p>业绩都是干出来的，<br />真干才能真出业绩、出真业绩。</p>
        <span className="quote-en">STAY GROUNDED · DELIVER VALUE</span>
      </aside>

      <section className="profiles section-pad" id="youth" aria-labelledby="profiles-title">
        <div className="profiles-heading">
          <div>
            <p className="section-kicker">YOUTH PRACTICE · 03</p>
            <h2 id="profiles-title">青年实干志</h2>
            <p>{youthProfiles.length} 位青年 · {youthProfiles.length} 份思考 · 把实绩写在岗位上</p>
          </div>
          <div className="profiles-total"><strong>{youthProfiles.length}</strong><span>位青年<br />实干之声</span></div>
        </div>

        <div className="profile-index" role="tablist" aria-label="选择青年人物">
          {youthProfiles.map((profile, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls="profile-stage"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => selectProfile(index)}
              key={profile.slot}
            >
              <span>{padNumber(profile.slot)}</span>
              <small>{profile.name || "待补"}</small>
            </button>
          ))}
        </div>

        <div className="profile-mobile-nav" aria-label="手机端人物切换">
          <button type="button" onClick={showPreviousProfile} aria-label="上一位青年">
            <span aria-hidden="true">←</span>
          </button>
          <label className="profile-jump">
            <span>选择青年</span>
            <select
              value={activeIndex}
              onChange={(event) => selectProfile(Number(event.target.value))}
              aria-controls="profile-stage"
            >
              {youthProfiles.map((profile, index) => (
                <option value={index} key={profile.slot}>
                  {padNumber(profile.slot)} · {profile.name || "资料待补"}
                </option>
              ))}
            </select>
            <small>左右滑动也可切换</small>
          </label>
          <button type="button" onClick={showNextProfile} aria-label="下一位青年">
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* The profile panel is focusable so keyboard and touch users share the same previous/next navigation. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <article
          className={`profile-stage slide-${slideDirection}${isDragging ? " is-dragging" : ""}`}
          key={activeProfile.slot}
          id="profile-stage"
          role="tabpanel"
          tabIndex={0}
          aria-live="polite"
          aria-atomic="true"
          aria-label={`第 ${activeProfile.slot} 位青年资料`}
          style={dragOffset ? {
            transform: `translate3d(${dragOffset}px, 0, 0) scale(${1 - Math.min(Math.abs(dragOffset) / 1800, 0.025)})`,
            opacity: 1 - Math.min(Math.abs(dragOffset) / 700, 0.18),
          } : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") showPreviousProfile();
            if (event.key === "ArrowRight") showNextProfile();
          }}
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
            setIsDragging(true);
          }}
          onTouchMove={(event) => {
            const start = touchStart.current;
            if (!start) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              const resistedOffset = Math.sign(deltaX) * Math.min(Math.abs(deltaX) * .82, 130);
              setDragOffset(resistedOffset);
            }
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            setIsDragging(false);
            setDragOffset(0);
            if (!start) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
              if (deltaX < 0) showNextProfile();
              else showPreviousProfile();
            }
          }}
          onTouchCancel={() => {
            touchStart.current = null;
            setIsDragging(false);
            setDragOffset(0);
          }}
        >
          <div className={`profile-visual photo-${activeProfile.imageLayout} fit-${activeProfile.imageFit}`}>
            {activeProfile.image ? (
              <>
                <img
                  className="profile-photo-backdrop"
                  src={activeProfile.image}
                  style={{ objectPosition: activeProfile.imagePosition }}
                  alt=""
                  aria-hidden="true"
                />
                <div className="profile-photo-frame">
                  <img
                    className="profile-photo"
                    src={activeProfile.image}
                    alt={`${activeProfile.name}个人照片`}
                    style={{ objectPosition: activeProfile.imagePosition }}
                  />
                </div>
              </>
            ) : (
              <div className="photo-placeholder">
                <span className="photo-slot">NO. {padNumber(activeProfile.slot)}</span>
                <div className="portrait-outline" aria-hidden="true"><i /><b /></div>
                <strong>照片待上传</strong>
                <small>PORTRAIT MATERIAL PENDING</small>
              </div>
            )}
            <div className="photo-caption"><span>BOC YOUTH</span><b>笃行者 · 奋斗者</b></div>
          </div>

          <div className="profile-content" key={activeProfile.slot}>
            <div className="profile-meta">
              <span>YOUTH PROFILE</span>
              <b>NO. {padNumber(activeProfile.slot)} / {youthProfiles.length}</b>
            </div>
            <h3>{activeProfile.name || "姓名待补充"}</h3>
            <p className="profile-department">
              {activeProfile.department || "所在机构待补充"}
              <span>·</span>
              {activeProfile.role || "岗位待补充"}
            </p>
            <div className="content-block reflection-block">
              <p className="content-label"><span>01</span> PRACTICE NOTES / 岗位感悟</p>
              <blockquote>
                {activeProfile.reflection || "岗位感悟待补充。"}
              </blockquote>
            </div>
          </div>
        </article>

        <div className="profile-controls">
          <button type="button" onClick={showPreviousProfile} aria-label="上一位青年">
            <span aria-hidden="true">←</span> 上一位
          </button>
          <div className="control-progress" aria-hidden="true">
            <i style={{ width: `${((activeIndex + 1) / youthProfiles.length) * 100}%` }} />
          </div>
          <span><strong>{padNumber(activeIndex + 1)}</strong> / {youthProfiles.length}</span>
          <button type="button" onClick={showNextProfile} aria-label="下一位青年">
            下一位 <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="closing section-pad">
        <div className="closing-rings" aria-hidden="true" />
        <p className="section-kicker light">YOUTH IN PRACTICE · 向实而行</p>
        <h2><span>实</span><i>·</i><span>干</span><i>·</i><span>效</span></h2>
        <p>心中有责任，脚下有行动。<br />以实干立身、以实绩作答，在金融服务一线书写青春答卷。</p>
        <a href="#top">回到篇首 <span aria-hidden="true">↑</span></a>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <div><strong>青鉴实干｜青年政绩观</strong><span>中国银行益阳分行团青主题 H5</span></div>
        </div>
        <div className="footer-meta">
          <p><span>来源</span>中国银行益阳分行团委</p>
          <p><span>栏目</span>青鉴实干｜政绩观</p>
          <p><span>资料</span>益阳分行青年干部岗位感悟</p>
        </div>
      </footer>
    </main>
  );
}

const fs = require('fs');
const file = 'c:/Users/User/.gemini/antigravity/scratch/Go-Music/apps/web/src/components/player/FullscreenPlayer.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `<div className="m-auto h-full w-full max-w-5xl overflow-hidden pt-0 pb-4 flex flex-col lg:grid lg:grid-cols-[360px_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-6 lg:items-start lg:justify-center">`;
const exactEnd = `              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
`;

const startIndex = content.indexOf(startStr);
if (startIndex === -1) {
    console.error("Start string not found");
    process.exit(1);
}

const endIndex = content.indexOf(exactEnd);
if (endIndex === -1) {
    console.error("End string not found");
    process.exit(1);
}

const replacement = `<div className="m-auto h-full w-full max-w-5xl overflow-hidden pt-0 pb-4 flex flex-col lg:grid lg:grid-cols-[360px_1fr] lg:gap-x-12 lg:items-center lg:justify-center">
            
            <div className="max-lg:contents lg:flex lg:flex-col lg:justify-center lg:h-full lg:col-start-1 lg:row-start-1">
              <div className="order-1 flex justify-center w-full">
                <div
                  ref={coverWrapperRef}
                  className="fullscreen-cover-wrapper relative flex h-[44vw] w-[44vw] max-h-[220px] max-w-[220px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[28px] shadow-2xl sm:h-[240px] sm:w-[240px] md:h-[280px] md:w-[280px] lg:h-[360px] lg:w-[360px]"
                  style={{
                    willChange: 'transform, opacity',
                    opacity: 1,
                    position: 'relative',
                  }}
                >
                  <div className="absolute inset-0">
                    <div className="fullscreen-cover-2d absolute inset-0">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={visualTrack.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{ background: \`linear-gradient(135deg, \${visualTrack.coverGradient?.[0] || '#333333'}, \${visualTrack.coverGradient?.[1] || '#222222'})\` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-4 mt-4 flex w-full flex-col items-center gap-2 lg:mt-8">
                <div className="fullscreen-progress-bar mt-2 mb-2 w-full max-w-md shrink-0">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(event) => seekTo(Number(event.target.value))}
                    className="accent-track h-1.5 w-full"
                    style={{ '--progress': \`\${progress}%\` } as React.CSSProperties}
                  />
                  <div className="mt-1 flex justify-between text-xs text-white/50">
                    <span>{formatDuration(Math.floor(currentTime))}</span>
                    <span>{formatDuration(Math.floor(duration))}</span>
                  </div>
                </div>

                <div className="fullscreen-controls shrink-0 w-full max-w-md">
                  <div className="flex items-center justify-center gap-1 sm:gap-3 w-full">
                    <button onClick={toggleShuffle} className={\`p-1.5 sm:p-2 transition \${shuffle ? 'text-accent' : 'text-white/50 hover:text-white'}\`}>
                      <RiShuffleLine size={22} />
                    </button>
                    <button onClick={() => toggleLike(visualTrack.id)} className="p-1.5 sm:p-2 transition hover:scale-110">
                      {isLiked ? <RiHeartFill size={22} className="text-accent" /> : <RiHeartLine size={22} className="text-white/50 hover:text-white" />}
                    </button>
                    <button onClick={prevTrack} className="p-1.5 sm:p-2 text-white/70 transition hover:text-white">
                      <RiSkipBackFill size={28} />
                    </button>
                    <button onClick={togglePlay} className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white text-surface transition hover:scale-105 shrink-0">
                      {isPlaying ? <RiPauseFill size={26} /> : <RiPlayFill size={26} className="ml-1" />}
                    </button>
                    <button onClick={nextTrack} className="p-1.5 sm:p-2 text-white/70 transition hover:text-white">
                      <RiSkipForwardFill size={28} />
                    </button>
                    <button onClick={toggleMute} className="p-1.5 sm:p-2 text-white/50 transition hover:text-white">
                      {isMuted || volume === 0 ? <RiVolumeMuteLine size={20} /> : <RiVolumeUpLine size={20} />}
                    </button>
                    <button onClick={cycleRepeat} className={\`p-1.5 sm:p-2 transition \${repeat !== 'off' ? 'text-accent' : 'text-white/50 hover:text-white'}\`}>
                      <RepeatIcon size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-lg:contents lg:flex lg:flex-col lg:justify-center lg:col-start-2 lg:row-start-1 lg:min-w-0">
              <div className="order-2 mt-4 flex flex-col items-center lg:mt-0 lg:items-start w-full">
                <div className="text-center lg:text-left max-w-2xl w-full">
                  <div ref={titleContainerRef} className="overflow-hidden">
                    <h1 
                      ref={titleTextRef}
                      className={\`fullscreen-track-title text-2xl font-bold leading-tight md:text-3xl \${
                        isTitleOverflowing ? 'animate-marquee inline-block whitespace-nowrap' : 'truncate'
                      }\`}
                    >
                      <span className={isTitleOverflowing ? 'pr-8' : ''}>{visualTrack.title}</span>
                      {isTitleOverflowing && (
                        <span className="pr-8" aria-hidden="true">{visualTrack.title}</span>
                      )}
                    </h1>
                  </div>
                  <p className="fullscreen-artist mt-1 text-base text-white/70 md:text-lg truncate">
                    {visualTrack.artist}
                  </p>
                  <div className="fullscreen-track-badges mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 shadow-md">
                      Queue {currentQueuePosition}/{Math.max(queue.length, 1)}
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 shadow-md">
                      {visualTrack.isLocal ? 'Local Track' : 'Streaming'}
                    </span>
                    {repeat !== 'off' ? (
                      <span className="rounded-full border border-accent/40 bg-accent/20 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent shadow-md">
                        {repeat === 'one' ? 'Repeat One' : 'Repeat All'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="order-3 mt-4 flex w-full flex-1 flex-col items-center gap-2.5 overflow-hidden min-h-0 lg:mt-6 lg:items-start">
                <div className="fullscreen-tabs flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-1.5 shadow-lg">
                  <button
                    onClick={handleShowLyrics}
                    className={\`flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 \${
                      isLyricsPanelActive ? 'bg-white text-black shadow-md' : 'text-white hover:bg-white/10'
                    }\`}
                  >
                    Lyrics
                  </button>
                  <button
                    onClick={handleShowQueue}
                    className={\`flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 \${
                      !isLyricsPanelActive ? 'bg-white text-black shadow-md' : 'text-white hover:bg-white/10'
                    }\`}
                  >
                    Queue
                  </button>
                </div>

                <div className={\`fullscreen-lyrics-panel flex flex-col flex-1 w-full min-h-0 \${
                  isLyricsPanelActive 
                    ? 'overflow-hidden lg:items-start' 
                    : 'max-w-md rounded-[24px] border border-white/20 bg-white/10 backdrop-blur-2xl p-3 shadow-2xl md:p-4 lg:self-start'
                }\`}>
                  {!isLyricsPanelActive && (
                    <div className="mb-2 flex items-center justify-between shrink-0">
                      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{panelTitle}</h2>
                      <div className="flex items-end gap-1">
                        {[0, 1, 2, 3].map((bar) => (
                          <span
                            key={bar}
                            className={\`w-1 rounded-full bg-accent/80 \${isPlaying ? 'animate-[bounce_0.9s_ease-in-out_infinite]' : ''}\`}
                            style={{
                              height: \`\${10 + bar * 5}px\`,
                              animationDelay: \`\${bar * 0.12}s\`,
                              opacity: isPlaying ? 1 : 0.45,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {isLyricsPanelActive ? (
                    <div className="relative w-full overflow-hidden min-h-[140px] h-[30vh] sm:min-h-[160px] sm:h-[28vh] md:min-h-[180px] md:h-[26vh] lg:min-h-[300px] lg:h-[45vh] max-w-3xl mx-auto lg:mx-0">
                      {lyrics.length > 0 ? (
                        <div className="absolute inset-0">
                          {visibleLyrics.map((line, index) => {
                            const actualIndex = lyricWindowStart + index;
                            const relativePosition = actualIndex - lyricFocusPosition;
                            const distance = Math.abs(relativePosition);
                            const direction = relativePosition < 0 ? -1 : 1;
                            const verticalOffset = direction * Math.pow(distance, 1.3) * 130;
                            const scaleValue = 1.1 - Math.min(distance * 0.15, 0.45);
                            const opacityValue = Math.max(0.08, 1 - distance * 0.2);
                            const blurAmount = Math.min(8, Math.pow(distance, 1.3) * 1.1);
                            const glow = Math.max(0, 1 - distance * 0.52);
                            const isCurrent = actualIndex === activeLyricIndex;

                            return (
                              <div
                                key={\`\${line.time}-\${actualIndex}\`}
                                className="absolute w-full max-w-3xl left-1/2 -translate-x-1/2 px-8 text-center lg:text-left font-bold"
                                style={{
                                  top: '50%',
                                  fontSize: 'clamp(0.9rem, 3.5vw, 1.5rem)',
                                  lineHeight: '1.3',
                                  transform: \`translate3d(-50%, calc(-50% + \${verticalOffset.toFixed(2)}px), 0) scale(\${scaleValue.toFixed(3)})\`,
                                  opacity: opacityValue,
                                  filter: \`blur(\${blurAmount.toFixed(2)}px) saturate(\${(0.76 + glow * 0.5).toFixed(2)})\`,
                                  color: 'white',
                                  textShadow: isCurrent
                                    ? \`0 0 \${Math.round(60 * glow)}px rgba(255,255,255,0.8), 0 0 \${Math.round(30 * glow)}px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.3)\`
                                    : \`0 0 \${Math.round(18 * glow)}px rgba(255,255,255,\${0.06 + glow * 0.1})\`,
                                  fontWeight: isCurrent ? '900' : '700',
                                  zIndex: isCurrent ? 10 : Math.max(1, 10 - Math.round(distance)),
                                  willChange: 'transform, opacity, filter',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  hyphens: 'auto',
                                  whiteSpace: 'normal',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: '1.3em',
                                  maxHeight: '3.9em',
                                }}
                              >
                                {line.text || '♪'}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-4">♪</div>
                            <p className="text-lg text-white/50">No lyrics available</p>
                            <p className="text-sm text-white/30 mt-2">Enjoy the music</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto min-h-[120px] flex items-center justify-center">
                      <div className="space-y-2 w-full h-full pt-2">
                        {visibleUpcomingTracks.length > 0 ? (
                          visibleUpcomingTracks.map((track, index) => {
                            const queuedCoverUrl = getTrackCoverUrl(track);
                            return (
                              <button
                                key={\`\${track.id}-\${index}\`}
                                onClick={() => handleTrackClick(track, index)}
                                className="queue-item flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/5"
                              >
                                {queuedCoverUrl ? (
                                  <img
                                    src={queuedCoverUrl}
                                    alt={track.title}
                                    className="h-11 w-11 rounded-xl object-cover"
                                  />
                                ) : (
                                  <div
                                    className="h-11 w-11 rounded-xl"
                                    style={{ background: \`linear-gradient(135deg, \${track.coverGradient?.[0] || '#333333'}, \${track.coverGradient?.[1] || '#222222'})\` }}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-white">{track.title}</div>
                                  <div className="truncate text-xs text-white/50">{track.artist}</div>
                                </div>
                                <span className="text-xs font-semibold text-white/40">#{index + 1}</span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl bg-white/5 p-3 text-sm text-white/60 text-center">
                            No tracks queued after this one.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
`;

const newContent = content.substring(0, startIndex) + replacement + exactEnd;
fs.writeFileSync(file, newContent, 'utf8');
console.log("File patched successfully!");

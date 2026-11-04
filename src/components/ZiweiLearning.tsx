import { useMemo, useState } from 'react';
import { detectPatterns } from '../vendor/ziwei-doushu/patterns';
import { STAR_DESCRIPTIONS } from '../vendor/ziwei-doushu/constants';
import { ALL_BOOKS, searchClassics } from '../vendor/ziwei-doushu/classics/index';
import type { ZiweiChart } from '../vendor/ziwei-doushu/types';

export default function ZiweiLearning({ chart, palaceName }: { chart: ZiweiChart; palaceName: string }) {
  const [query, setQuery] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [bookSlug, setBookSlug] = useState('');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [starName, setStarName] = useState('');
  const patterns = useMemo(() => detectPatterns(chart), [chart]);
  const palace = chart.palaces.find(p => p.name === palaceName);
  const selected = palace?.stars.find(s => s.name === starName) || palace?.stars[0];
  const description = selected && STAR_DESCRIPTIONS[selected.name];
  const hits = useMemo(() => query.trim() ? searchClassics(query.trim(), 30) : [], [query]);
  const book = ALL_BOOKS.find(b => b.slug === bookSlug) || ALL_BOOKS[0];
  const chapter = book.chapters[Math.min(chapterIndex, book.chapters.length - 1)];
  return <section className="paper p-4 space-y-4" aria-label="命盘研习">
    <h3 className="text-gold-bright title-display">命盘研习 <span className="text-xs text-gold">· 本地计算，离线可用</span></h3>
    <details>
      <summary className="learning-summary">格局识别 · {patterns.length} 项</summary>
      <p className="learning-note">以下为传统规则的条件匹配，展示成立依据及破格因素，不能替代整盘分析。</p>
      {!patterns.length && <p className="text-xs text-rice">未匹配到已收录格局，可继续查看星曜与原典。</p>}
      <div className="space-y-3 mt-3">{patterns.map((pattern, index) => <article key={`${pattern.name}-${index}`} className="learning-entry">
        <h4 className="text-sm text-gold-bright">{pattern.name}</h4>
        <p className="text-xs text-rice leading-relaxed mt-1">{pattern.description}</p>
        {pattern.conditions?.required.length ? <p className="learning-note">成立：{pattern.conditions.required.join('；')}</p> : null}
        {pattern.conditions?.bonus?.length ? <p className="learning-note">助力：{pattern.conditions.bonus.join('；')}</p> : null}
        {pattern.conditions?.breaking?.length ? <p className="text-xs text-vermilion mt-2">破格因素：{pattern.conditions.breaking.join('；')}</p> : null}
        {pattern.source && <p className="learning-note">出处：{pattern.source}</p>}
      </article>)}</div>
    </details>
    <details>
      <summary className="learning-summary">星曜详情 · {palaceName}</summary>
      <div className="flex flex-wrap gap-2 my-3">{palace?.stars.map(s => <button key={s.name} className={`px-3 py-2 text-xs rounded ${selected?.name === s.name ? 'btn-vermilion' : 'btn-ghost'}`}
        aria-pressed={selected?.name === s.name} onClick={() => setStarName(s.name)}>{s.name}</button>)}</div>
      {selected && <article className="learning-entry">
        <h4 className="text-gold-bright text-sm">{selected.name} · {palaceName}{selected.brightnessRaw ? ` · ${selected.brightnessRaw}` : ''}{selected.siHua ? ` · 化${selected.siHua}` : ''}</h4>
        {description ? <p className="text-xs text-rice leading-relaxed mt-2">{description.keywords} · {description.nature} · 五行{description.element}</p>
          : <p className="learning-note">本地说明尚未收录此星，可查询原典。</p>}
        <button className="btn-ghost px-3 py-2 mt-3 text-xs" onClick={() => { setQuery(selected.name); setLibraryOpen(true); }}>查「{selected.name}」原典</button>
      </article>}
    </details>
    <details open={libraryOpen} onToggle={e => setLibraryOpen(e.currentTarget.open)}>
      <summary className="learning-summary">古籍原典 · 三部选录</summary>
      <label className="block text-xs text-gold mt-3">检索原文
        <input className="birth-clock" aria-label="古籍检索" value={query} onChange={e => setQuery(e.target.value)} placeholder="输入星曜、宫位或关键词" maxLength={80} />
      </label>
      {query.trim() ? <div className="space-y-3 mt-3" aria-live="polite">
        <p className="learning-note">{hits.length ? `找到 ${hits.length}${hits.length === 30 ? ' 条（最多显示三十条）' : ' 条'}` : '未找到相关原文，可尝试更短的关键词。'}</p>
        <div className="max-h-96 overflow-auto space-y-3" tabIndex={0} aria-label="古籍检索结果">{hits.map(hit => <article className="learning-entry" key={hit.paragraphId}>
          <p className="text-xs text-gold-bright">《{hit.bookTitle}》 · {hit.chapterTitle}</p>
          <p className="text-sm text-rice leading-loose mt-2">{hit.text}</p>
        </article>)}</div>
        <button className="btn-ghost px-3 py-2 text-xs" onClick={() => setQuery('')}>清除检索，浏览章节</button>
      </div> : <div className="space-y-3 mt-3">
        <label className="block text-xs text-gold">书目<select aria-label="古籍书目" className="birth-clock" value={book.slug} onChange={e => { setBookSlug(e.target.value); setChapterIndex(0); }}>
          {ALL_BOOKS.map(b => <option key={b.slug} value={b.slug}>{b.title}</option>)}
        </select></label>
        <label className="block text-xs text-gold">章节<select aria-label="古籍章节" className="birth-clock" value={Math.min(chapterIndex, book.chapters.length - 1)} onChange={e => setChapterIndex(Number(e.target.value))}>
          {book.chapters.map((c, index) => <option key={c.title} value={index}>{c.title}</option>)}
        </select></label>
        <p className="learning-note">{book.dynasty} · {book.author} · {book.intro}</p>
        <div className="max-h-96 overflow-auto space-y-4" tabIndex={0} aria-label={`${book.title}原文`}>
          {chapter.paragraphs.map(p => <p key={p.id} className="text-sm text-rice leading-loose">{p.text}</p>)}
        </div>
      </div>}
      <p className="learning-note">公版古籍选录，来自 <a className="underline" href="https://github.com/Renhuai123/ziwei-doushu/tree/main/lib/classics" target="_blank" rel="noreferrer">紫微斗数开源项目</a>。保留原文措辞，仅作传统术数学习资料。</p>
    </details>
  </section>;
}

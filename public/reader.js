const chapterCache = new Map();
export async function getChapter(book, chapter, translation) {
  const key = `${book}:${chapter}:${translation}`;
  if (!chapterCache.has(key)) {
    const request = fetch(`/api/passage?reference=${encodeURIComponent(`${book} ${chapter}`)}&translation=${translation}`, {signal: AbortSignal.timeout(20000)})
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.verses?.length) throw new Error('Chapter unavailable');
        return data;
      }).catch(error => { chapterCache.delete(key); throw error; });
    chapterCache.set(key, request);
  }
  return chapterCache.get(key);
}

export class BookReader {
  constructor(element, onSelect) {
    this.element = element;
    this.onSelect = onSelect;
    this.generation = 0;
    this.loading = false;
    this.failed = false;
    element.addEventListener('scroll', () => this.checkEdges(), {passive: true});
  }
  cancel() {
    this.generation++; this.loading = false; this.element.inert = false; this.element.removeAttribute('aria-busy');
    if(this.previous) this.previous.disabled = false;
    if(this.next) this.next.disabled = false;
  }
  async open(book, chapter, verse, translation, chapterCount) {
    const generation = ++this.generation;
    this.loading = true; this.element.inert = true; this.element.setAttribute('aria-busy','true');
    try {
      const data = await getChapter(book, chapter, translation);
      if (generation !== this.generation) return;
      if (!data.verses.some(v => v.verse === verse)) throw new Error('Verse unavailable');
      this.book = book; this.translation = translation; this.chapterCount = chapterCount;
      this.first = chapter; this.last = chapter; this.failed = false;
      this.previous = this.edge('previous'); this.next = this.edge('next');
      this.element.replaceChildren(this.previous, this.section(chapter, data), this.next);
      this.element.setAttribute('aria-label', `${book}, ${translation.toUpperCase()} — scroll to read chapters`);
      this.updateEdges();
      const button = this.element.querySelector(`[data-chapter="${chapter}"][data-verse="${verse}"]`);
      this.select(button, data, chapter, verse);
      // Scroll only the reader, without moving the page or the chat composer.
      this.element.scrollTop += button.getBoundingClientRect().top - this.element.getBoundingClientRect().top - 24;
    } finally {
      if (generation === this.generation) { this.loading = false; this.element.inert = false; this.element.removeAttribute('aria-busy'); }
    }
  }
  edge(direction) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'reader-edge'; button.dataset.direction = direction;
    button.onclick = () => { this.failed = false; this.extend(direction); };
    return button;
  }
  updateEdges() {
    this.previous.hidden = this.first === 1;
    this.next.hidden = this.last === this.chapterCount;
    this.previous.textContent = '↑ Earlier chapter';
    this.next.textContent = 'Next chapter ↓';
  }
  section(chapter, data) {
    const section = document.createElement('section'); section.className = 'reader-chapter';
    const heading = document.createElement('h3'); heading.textContent = `${this.book} ${chapter}`;
    section.append(heading);
    for (const item of data.verses) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'reader-verse';
      button.dataset.chapter = chapter; button.dataset.verse = item.verse;
      button.setAttribute('aria-label', `${this.book} ${chapter}:${item.verse}`);
      button.setAttribute('aria-pressed', 'false');
      const number = document.createElement('sup'); number.textContent = item.verse;
      button.append(number, document.createTextNode(item.text.trim()));
      button.onclick = () => this.select(button, data, chapter, item.verse);
      section.append(button);
    }
    return section;
  }
  select(button, data, chapter, verse) {
    this.element.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    const item = data.verses.find(v => v.verse === verse);
    this.onSelect({book:this.book, chapter, verse, data, reference:`${this.book} ${chapter}:${verse}`, translation:this.translation.toUpperCase(), text:item.text.trim()});
  }
  checkEdges() {
    if (this.loading || this.failed || !this.previous) return;
    if (this.element.scrollTop < 60 && this.first > 1) this.extend('previous');
    else if (this.element.scrollTop + this.element.clientHeight > this.element.scrollHeight - 100 && this.last < this.chapterCount) this.extend('next');
  }
  async extend(direction) {
    if (this.loading) return;
    const earlier = direction === 'previous';
    const chapter = earlier ? this.first - 1 : this.last + 1;
    if (chapter < 1 || chapter > this.chapterCount) return;
    const generation = this.generation; const edge = earlier ? this.previous : this.next;
    this.loading = true; edge.disabled = true; edge.textContent = 'Loading chapter…';
    try {
      const data = await getChapter(this.book, chapter, this.translation);
      if (generation !== this.generation) return;
      const anchor = this.element.querySelector('.reader-chapter');
      const before = anchor.getBoundingClientRect().top;
      const section = this.section(chapter, data);
      if (earlier) { this.previous.after(section); this.first = chapter; }
      else { this.next.before(section); this.last = chapter; }
      this.updateEdges();
      // Keep the same text under the reader's eye when prepending a chapter.
      if (earlier) this.element.scrollTop += anchor.getBoundingClientRect().top - before;
    } catch {
      if (generation !== this.generation) return;
      this.failed = true; edge.textContent = 'Could not load chapter. Tap to retry.';
    } finally {
      if (generation === this.generation) {this.loading = false; edge.disabled = false;}
    }
  }
}

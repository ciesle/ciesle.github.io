(() => {
  const articleContent = document.querySelector('.blog-content');

  if (!articleContent) return;
  const expandableImages = Array.from(articleContent.querySelectorAll('img, figure > svg'))
    .filter(image => !image.closest('a, button, .card, [class*="card-"], [class*="-card"], [class*="card__"]'));

  let viewer;
  let closeButton;
  let returnFocus;
  let cloneSequence = 0;
  const accessibleNames = new WeakMap();

  const elementName = element => {
    const labelledName = element.getAttribute('aria-label')?.trim();
    if (labelledName) return labelledName;

    const alt = element.getAttribute('alt')?.trim();
    if (alt) return alt;

    const titleAttribute = element.getAttribute('title')?.trim();
    if (titleAttribute) return titleAttribute;

    const svgTitle = element.querySelector?.('title')?.textContent?.trim();
    if (svgTitle) return svgTitle;

    return element.tagName.toLowerCase() === 'svg' ? '図' : '画像';
  };

  const fitMedia = (media, width, height) => {
    media.style.width = width > 0 && height > 0
      ? `min(100%, ${100 * width / height}dvh)`
      : '100%';
  };

  const remapSvgIds = svg => {
    const elements = [svg, ...svg.querySelectorAll('*')];
    const idMap = new Map();

    for (const element of elements) {
      const id = element.getAttribute('id');
      if (!id) continue;

      const replacement = `article-image-viewer-${++cloneSequence}-${id}`;
      idMap.set(id, replacement);
      element.setAttribute('id', replacement);
    }

    if (idMap.size === 0) return;

    for (const element of elements) {
      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        let value = attribute.value;

        if (['aria-labelledby', 'aria-describedby', 'aria-owns', 'aria-controls', 'aria-flowto'].includes(name)) {
          value = value.split(/\s+/).map(id => idMap.get(id) ?? id).join(' ');
        } else if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
          value = `#${idMap.get(value.slice(1)) ?? value.slice(1)}`;
        } else {
          value = value.replace(/url\(\s*(["']?)#([^)'"\s]+)\1\s*\)/g, (match, quote, id) => {
            const replacement = idMap.get(id);
            return replacement ? `url(${quote}#${replacement}${quote})` : match;
          });
        }

        if (value !== attribute.value) element.setAttribute(attribute.name, value);
      }
    }
  };

  const createImageMedia = source => {
    const media = document.createElement('img');
    const alt = source.getAttribute('alt');
    media.setAttribute('alt', alt ?? accessibleNames.get(source));
    media.className = 'article-image-viewer__media';

    const updateWidth = () => {
      fitMedia(media, media.naturalWidth || source.naturalWidth, media.naturalHeight || source.naturalHeight);
    };
    media.addEventListener('load', updateWidth, { once: true });
    updateWidth();
    media.src = source.currentSrc || source.src || source.getAttribute('src') || '';
    return media;
  };

  const createSvgMedia = source => {
    const media = source.cloneNode(true);
    const classNames = (media.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    if (!classNames.includes('article-image-viewer__media')) classNames.push('article-image-viewer__media');
    media.setAttribute('class', classNames.join(' '));
    media.removeAttribute('tabindex');
    media.setAttribute('role', 'img');
    media.setAttribute('aria-label', accessibleNames.get(source));

    const viewBox = source.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
    fitMedia(media, viewBox?.[2], viewBox?.[3]);
    remapSvgIds(media);
    return media;
  };

  const ensureViewer = () => {
    if (viewer) return viewer;

    viewer = document.createElement('dialog');
    viewer.className = 'article-image-viewer';
    viewer.setAttribute('aria-label', '画像の拡大表示');
    viewer.setAttribute('autofocus', '');

    closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'article-image-viewer__close';
    closeButton.setAttribute('aria-label', '拡大表示を閉じる');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      if (viewer.open) viewer.close();
    });

    viewer.addEventListener('click', event => {
      if (event.target === viewer && viewer.open) viewer.close();
    });
    viewer.addEventListener('close', () => {
      document.body.classList.remove('article-image-viewer-open');
      viewer.replaceChildren(closeButton);
      const focusedElement = returnFocus;
      returnFocus = null;
      if (focusedElement && focusedElement.isConnected !== false) focusedElement.focus();
    });

    viewer.replaceChildren(closeButton);
    document.body.append(viewer);
    return viewer;
  };

  const openViewer = source => {
    const dialog = ensureViewer();
    const media = source.tagName.toLowerCase() === 'img'
      ? createImageMedia(source)
      : createSvgMedia(source);

    returnFocus = source;
    dialog.replaceChildren(closeButton, media);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('article-image-viewer-open');
  };

  for (const image of expandableImages) {
    const name = elementName(image);
    const isSvg = image.tagName.toLowerCase() === 'svg';
    accessibleNames.set(image, name);
    image.setAttribute('role', 'button');
    image.setAttribute('tabindex', '0');
    image.setAttribute('aria-label', `${isSvg ? '図' : '画像'}を拡大: ${name}`);
    image.setAttribute('data-image-expandable', '');

    image.addEventListener('click', event => {
      if (event.target !== image && event.target?.closest?.('a, button')) return;
      openViewer(image);
    });
    image.addEventListener('keydown', event => {
      if (event.target !== image && event.target?.closest?.('a, button')) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openViewer(image);
    });
  }
})();

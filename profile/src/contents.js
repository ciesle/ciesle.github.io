function openChapter(hash) {
  const target = document.getElementById(hash.slice(1));
  const chapter = target?.closest('details.profile-chapter');
  if (chapter) chapter.open = true;
}

window.addEventListener('hashchange', () => openChapter(location.hash));
document.querySelector('.profile-toc').addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  openChapter(link.hash);
});
openChapter(location.hash);

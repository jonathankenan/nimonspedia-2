document.addEventListener("DOMContentLoaded", () => {
  const editorContainer = document.getElementById("editor");
  if (!editorContainer) return; 

  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'blockquote', 'code-block'],
        ['clean']
      ]
    }
  });

  const form = document.querySelector('form');
  form.addEventListener('submit', function () {
    const html = quill.root.innerHTML;
    document.querySelector('#store_description').value = html;
  });
});

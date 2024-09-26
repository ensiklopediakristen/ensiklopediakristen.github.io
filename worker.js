self.onmessage = function(event) {
   const article = event.data;
   // Fetch article and process it
   fetch(article.file)
      .then(response => response.text())
      .then(content => {
         self.postMessage({ article, content });
      })
      .catch(error => {
         self.postMessage({ error });
      });
};
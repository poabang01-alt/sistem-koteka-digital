// Font Awesome is required by the visible navigation icons. Start its
      // request immediately, then retry automatically after two seconds if a
      // browser deferred the stylesheet mutation during the initial parse.
      (function () {
        var iconsLoaded = false;
        var loadIcons = function () {
          if (iconsLoaded) return;
          var stylesheet = document.getElementById('fontawesome-stylesheet');
          if (!stylesheet || !stylesheet.dataset.href) return;
          iconsLoaded = true;
          stylesheet.href = stylesheet.dataset.href;
          stylesheet.media = 'all';
        };

        loadIcons();
        window.setTimeout(loadIcons, 2000);
      })();

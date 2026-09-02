// Play branded reveal videos once when they enter the viewport.
(function () {
    function startVisibleVideos() {
        var videos = document.querySelectorAll('[data-brand-reveal]');
        if (!videos.length) return;

        function playOnce(video) {
            if (video.dataset.played === 'true') return;
            video.dataset.played = 'true';
            video.muted = true;
            video.loop = false;
            var playback = video.play();
            if (playback && playback.catch) {
                playback.catch(function () {
                    video.dataset.played = 'false';
                });
            }
        }

        if (!('IntersectionObserver' in window)) {
            Array.prototype.forEach.call(videos, playOnce);
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
                    playOnce(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: [0.35] });

        Array.prototype.forEach.call(videos, function (video) {
            video.muted = true;
            video.loop = false;
            observer.observe(video);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startVisibleVideos, { once: true });
    } else {
        startVisibleVideos();
    }
}());

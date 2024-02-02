export const fetchEpisodeId = (title, episode, callback) => {
  GM_xmlhttpRequest({
    url: `https://api.dandanplay.net/api/v2/search/episodes?anime=${title}&episode=${episode}`, headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    }, responseType: "json", anonymous: true, onload: (response) => {
      if (response.status !== 200) {
        return;
      }
      if (response.response["animes"].length === 0) {
        return;
      }
      let episodes = response.response["animes"][0]["episodes"];
      if (episodes.length === 0) {
        return;
      }
      let episodeId = episodes[0]["episodeId"];
      callback(episodeId);
    }
  });
}

const fetchComments = (episodeId, callback) => {
  GM_xmlhttpRequest({
    url: `https://api.dandanplay.net/api/v2/comment/${episodeId}?withRelated=true`, headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
    }, responseType: "json", anonymous: true, onload: (response) => {
      // console.log("[HZ] comments:", response.response);
      // _setComments(response.response.comments);
      callback(response.response.comments);
    }
  });
}

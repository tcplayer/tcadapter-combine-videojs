import videojs from '../video.js';
import TcAdapter from 'tcadapter';

class Adapter {
  constructor(source, tech, options) {
    const el = tech.el();
    // 建议：TcAdapter 所需参数可以在初始化 videojs 实例时传入，并传递到此处
    // 以下获取appid等参数的方式为演示方式，是为了更清晰说明流程而采用的简化实现方式
    const adapter = new TcAdapter(el, {
      // demo1 encrypted
      appID: '1500002611',
      fileID: '5285890813738446783',
      psign: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6MTUwMDAwMjYxMSwiZmlsZUlkIjoiNTI4NTg5MDgxMzczODQ0Njc4MyIsImN1cnJlbnRUaW1lU3RhbXAiOjE2MTU5NTEyMzksImV4cGlyZVRpbWVTdGFtcCI6MjIxNTY1MzYyMywicGNmZyI6ImJhc2ljRHJtUHJlc2V0IiwidXJsQWNjZXNzSW5mbyI6eyJ0IjoiMjIxNTY1MzYyMyJ9fQ.hRrQYvC0UYtcO-ozB35k7LZI6E3ruvow7DC0XzzdYKE',
      hlsConfig: {},
    });
    adapter.on('hlsLevelLoaded', this.onLevelLoaded.bind(this));
    adapter.on('hlsError', this.onError.bind(this));
    this.adapter = adapter;
    // console.log('TcAdapterEvents', TcAdapter.TcAdapterEvents);
  }

  dispose() {
    this.hls.destroy();
  }

  onLevelLoaded(event) {
    this._duration = event.details.live ? Infinity : event.details.totalduration;
  }

  onError(event) {
    console.log('error', event.message);
    if (event.fatal) {
      switch (event.type) {
        case 'networkError':
          // try to recover network error
          console.log('fatal network error encountered, try to recover');
          this.adapter.startLoad();
          break;
        case 'mediaError':
          console.log('fatal media error encountered, try to recover');
          this.adapter.recoverMediaError();
          break;
        default:
          // cannot recover
          this.adapter.destroy();
          break;
      }
    }
  }
}


let hlsTypeRE = /^application\/(x-mpegURL|vnd\.apple\.mpegURL)$/i;
let hlsExtRE = /\.m3u8/i;

let HlsSourceHandler = {
  name: 'hlsSourceHandler',
  canHandleSource: function (source) {
    // skip hls fairplay, need to use Safari resolve it.
    if (source.skipHlsJs || (source.keySystems && source.keySystems['com.apple.fps.1_0'])) {
      return '';
    } else if (hlsTypeRE.test(source.type)) {
      return 'probably';
    } else if (hlsExtRE.test(source.src)) {
      return 'maybe';
    } else {
      return '';
    }
  },

  handleSource: function (source, tech, options) {
    if (tech.hlsProvider) {
      tech.hlsProvider.dispose();
      tech.hlsProvider = null;
    } else {
      // hls关闭自动加载后，需要手动加载资源
      if (options.hlsConfig && options.hlsConfig.autoStartLoad === false) {
        tech.on('play', function () {
          if (!this.player().hasStarted()) {
            this.hlsProvider.hls.startLoad();
          }
        });
      }
    }
    tech.hlsProvider = new Adapter(source, tech, options);
    return tech.hlsProvider;
  },
  canPlayType: function (type) {
    if (hlsTypeRE.test(type)) {
      return 'probably';
    }
    return '';
  }
};

function mountHlsProvider(enforce) {
  if (TcAdapter && TcAdapter.isSupported() || !!enforce) {
    //tbs 内核，Safari不能使用hls.js

    try {
      let html5Tech = videojs.getTech && videojs.getTech('Html5');
      if (html5Tech) {
        html5Tech.registerSourceHandler(HlsSourceHandler, 0);
      }
    } catch (e) {
      console.error('hls.js init failed');
    }
  } else {
    //没有引入hls.js 或者 MSE 不可用或者x5内核禁用
  }
}
mountHlsProvider();
export default Adapter;

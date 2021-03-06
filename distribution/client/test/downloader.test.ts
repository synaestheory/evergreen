jest.mock('fs');

const fs         = require('fs');
const mkdirp     = require('mkdirp');

import Downloader from '../src/lib/downloader';
import Checksum from '../src/lib/checksum';

describe('the Downloader class', () => {
  describe('download()', () => {
    let item = 'https://jenkins.io';
    let dir  = '/tmp';

    beforeEach(() => {
      /* Make sure memfs is flushed every time */
      fs.volume.reset();
      mkdirp.sync(dir);

      // default is 5 seconds, could be bigger because of the various file sizes and network flakiness
      jest.setTimeout(120000);
    });

    it('should return promise', async () => {
      // jenkins.io is ~70 kB.
      let response = Downloader.download(`${item}/index.html`, dir, 'index.html');
      expect(response instanceof Promise).toBeTruthy();
      await response;

      expect(fs.readFileSync(`${dir}/index.html`)).toBeTruthy();
    });

    it('should fail on url without final basename-ish path', () => {
      expect(() => {
        Promise.resolve(Downloader.download(`${item}/`, dir));
      }).toThrow();
    });

    describe('with real downloads', () => {

      it('should fail on an invalid signature', async () => {
        try {
          await Downloader.download('https://jenkins.io/index.html',
            dir,
            'index.html',
            'bogus-signature');
          expect(true).toBeFalsy();
        } catch (err) {
          expect(err.message.startsWith('Signature verification')).toBeTruthy();
        }
      });

      it('should manage to download a decently big file, retrying if needed', async () => {
        // plugin is ~1 MB, so it could make tests more flaky and cumbersome with flaky connection
        const toDownload = 'http://updates.jenkins-ci.org/download/plugins/blueocean-pipeline-editor/1.5.0/blueocean-pipeline-editor.hpi';
        const sha256 = 'ccaaae7c899b7b15a5bd60f1e59336ca9adf5d08c01de5d123416e83ea5314db';
        await Downloader.download(toDownload, dir, 'ace-editor.hpi');
        expect(Checksum.signatureFromFile(`${dir}/ace-editor.hpi`)).toEqual(sha256);
      });

      it('should not retry too fast on failed download', async () => {
        const toDownload = 'http://nonexisting-url-dont-retry-too-fast.org/thefile';
        const startTime = new Date();
        try {
          await Downloader.download(toDownload, dir, 'thefile', null, {delay: 20, retry: 4, factor: 10});
          expect(false).toBeTruthy(); // fail(), should not reach this line.
        } catch (e) {
          const endTime = new Date();
          // 4 attempts, no delay for the first, then 20 ms, 20*10 (exponential factor), 20*10*10
          expect((endTime as any) - (startTime as any)).toBeGreaterThan(0 + 20 + 200 + 2000);
        }
      });
    });
  });

  describe('formatDuration()', () => {
    it('should format date correctly', () => {

      expect(Downloader.formatDuration(10)).toBe('10ms');
      expect(Downloader.formatDuration(999)).toBe('999ms');
      expect(Downloader.formatDuration(1.09 * 1000)).toBe('1.1s');
      expect(Downloader.formatDuration(1.201 * 1000)).toBe('1.2s');
      expect(Downloader.formatDuration(10.8 * 1000)).toBe('10s');
      expect(Downloader.formatDuration(72.843 * 1000)).toBe('72s');
    });
  });
});

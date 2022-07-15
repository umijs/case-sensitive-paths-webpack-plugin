import path from 'path';
import type { Compiler } from 'webpack';

const PLUGIN_NAME = 'CaseSensitivePathsPlugin';

class CaseSensitivePathsPlugin {
  fs!: Compiler['inputFileSystem'];
  context: string = '';
  cacheMap = new Map<string, string[]>();
  deferrerMap = new Map<string, Promise<string[]>>();

  /**
   * Check if resource need to be checked
   */
  isCheckable(res: string, type?: string, issuer?: string) {
    return (
      // skip base64 url in css files
      type !== 'asset/inline' &&
      // skip resources which outside project
      res.startsWith(this.context) &&
      // skip node_modules
      !/(\/|\\)node_modules\1/.test(res) &&
      // skip duplicated css resource by unknown reason
      res !== issuer
    );
  }

  /**
   * Check if file exists with case sensitive
   */
  async checkFileExistsWithCase(res: string) {
    return new Promise((resolve, reject) => {
      let full = res;
      let caseError: Error | null = null;
      const deferrers: Promise<string[]>[] = [];

      // check every level directories for resource, except outside project
      while (full.length > this.context.length) {
        const { dir, base: current } = path.parse(full);
        let deferrer: typeof deferrers['0'];

        if (this.cacheMap.get(dir)) {
          // use cache first
          deferrer = Promise.resolve(this.cacheMap.get(dir)!);
        } else if (this.deferrerMap.get(dir)) {
          // wait another same directory to be resolved
          deferrer = this.deferrerMap.get(dir)!;
        } else {
          // read directory for the first time
          deferrer = new Promise((resolve) => {
            this.fs.readdir(dir, (_, files = []) => {
              // save cache, resolve promise and release deferrer
              this.cacheMap.set(dir, files as string[]);
              resolve(files as string[]);
              this.deferrerMap.delete(dir);
            });
          });
          // save deferrer for another called
          this.deferrerMap.set(dir, deferrer);
        }

        // check current file synchronously, for performance
        deferrer.then((files) => {
          // try to find correct name
          // if current file not exists in current directory and there has no existing error
          if (!files.includes(current) && !caseError) {
            const correctName = files.find(
              (file) => file.toLowerCase() === current.toLowerCase(),
            );

            // only throw first error for the single resource
            if (correctName) {
              caseError = new Error(
                `[${PLUGIN_NAME}] \`${path.join(
                  res,
                )}\` does not match the corresponding path on disk \`${correctName}\``,
              );
              reject(caseError);
            }
          }
        });
        deferrers.push(deferrer);

        // continue to check upper directory
        full = dir;
      }

      Promise.all(deferrers).then(() => {
        // resolve if no error
        if (!caseError) {
          resolve(caseError);
        }
      });
    });
  }

  /**
   * reset this plugin, wait for the next compilation
   */
  reset() {
    this.cacheMap = new Map();
    this.deferrerMap = new Map();
  }

  apply(compiler: Compiler) {
    this.context = compiler.options.context || process.cwd();
    this.fs = compiler.inputFileSystem;

    compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, (factory) => {
      factory.hooks.afterResolve.tapAsync(PLUGIN_NAME, (data, done) => {
        // compatible with webpack 4.x
        const { createData = data as typeof data.createData } = data;

        if (
          createData.resource &&
          this.isCheckable(
            createData.resource,
            createData.type,
            createData.resourceResolveData?.context?.issuer,
          )
        ) {
          this.checkFileExistsWithCase(
            createData.resource
              .replace(/\?.+$/, '')
              // replace escaped \0# with # see: https://github.com/webpack/enhanced-resolve#escaping
              .replace('\u0000#', '#'),
          ).then(
            () => done(null),
            (err) => done(err),
          );
        } else {
          done(null);
        }
      });
    });

    compiler.hooks.done.tap(PLUGIN_NAME, () => {
      this.reset();
    });
  }
}

export = CaseSensitivePathsPlugin;

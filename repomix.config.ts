import { defineConfig } from 'repomix';

export default defineConfig({
  output: {
    style: 'markdown',
  },
  include: [
    // src
    'src/**/index.ts',
    'src/core.ts',
    'src/utils/init-scheduler.ts',
    'src/utils/pipe.ts',
    'src/systems/base*.ts',
    // // test
    'test/test-utils.ts',
    'test/systems/view.test.ts'
  ],
});

import { OnConfig } from '../systems/index.js';

const createDefaultLogger = <State, Event>(name: string): OnConfig<State, Event> => {
  const green = '\x1b[32m';
  const orange = '\x1b[38;5;208m'; // True orange for 256-color terminals
  const cyan = '\x1b[36m';
  const red = '\x1b[31m';
  const reset = '\x1b[0m';
  return {
    init: () => {
      console.log(`${green}[${name}] 🌱 Sprout (Init)${reset}`);
    },
    next: (state) => {
      console.log(`${orange}[${name}] 🍊 Ripen (State Change)${reset}`);
      console.dir(state, { depth: null, colors: true });
    },
    dispatch: (event) => {
      console.log(`${cyan}[${name}] 🌧️  Water (Dispatch)${reset}`);
      console.dir(event, { depth: null, colors: true });
    },
    dispose: () => {
      console.log(`${red}[${name}] 🍂 Decay (Dispose)${reset}`);
    },
  };
};

export { createDefaultLogger };

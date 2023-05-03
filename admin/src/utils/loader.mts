import ora from "ora";

const loader: {
  _tid: NodeJS.Timer | undefined;
  self: any;
  start: (a: string) => NodeJS.Timer;
  stop: () => void;
} = {
  _tid: undefined,
  self: ora(),
  start(msg: string) {
    loader.self.start();
    loader.self.text = msg;
    loader._tid = setTimeout(() => {
      loader.self.text = msg;
    }, 1000);
    return loader._tid;
  },
  stop() {
    loader._tid && clearTimeout(loader._tid);
    loader.self.stop();
  },
};

export default loader;

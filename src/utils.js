/*global d3*/
function cleanData(d) {
  return {
    group: d["Ambiente"],
    task: +d["Tarefa"],
    duration: d["Duracao_Tarefa"] / 1000,
    correctness: (d["Acertou_tarefa"] =
      d["Acertou_tarefa"] === "TRUE" ? true : false)
  };
}

function sortByBool(x, y) {
  // true values first
  return x === y ? 0 : x ? -1 : 1;
  // false values first
  // return (x === y)? 0 : x? 1 : -1;
}

function getRandomInt(length) {
  const min = 0;
  const max = Math.floor(length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resample(arr) {
  return arr.map(() => arr[getRandomInt(arr.length)]);
}

function boot(arr, reducer) {
  const boots = [];
  for (let i = 0; i < 20000; i++) {
    boots.push(resample(arr));
  }

  return boots.map(arr => reducer(arr));
}

function getCI(arr) {
  const means = boot(arr, d3.mean).sort(d3.ascending);
  return [d3.quantile(means, 0.025), d3.quantile(means, 0.975)];
}

function bootComparison(term1, term2) {
  const meansDiff = [];
  for (let i = 0; i < 20000; i++) {
    const r1 = resample(term1);
    const r2 = resample(term2);
    const mean1 = d3.mean(r1);
    const mean2 = d3.mean(r2);
    meansDiff.push(mean1 - mean2);
  }
  meansDiff.sort(d3.ascending);
  return {
    mean: d3.mean(meansDiff),
    ci: [d3.quantile(meansDiff, 0.025), d3.quantile(meansDiff, 0.975)]
  };
}

function getPooledStd(arr1, arr2) {
  const std1 = d3.deviation(arr1);
  const std2 = d3.deviation(arr2);
  return Math.sqrt((std1 * std1 + std2 * std2) / 2);
}

window.getCI = getCI;

export { cleanData, sortByBool, getCI, bootComparison, getPooledStd };

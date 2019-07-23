d3.csv("../data/dadosAnderson.csv", function(d) {
  return {
    ambiente: d["Ambiente"],
    participante: +d["Participante"].slice(7),
    tarefa: +d["Tarefa"],
    tempo: +d["Duracao_Tarefa"] / 1000,
    correto: d["Acertou_tarefa"] === "TRUE"
  };
}).then(data => {
  const hierarchy = aggregate(data, "tarefa").sort();
  hierarchy.forEach(node => {
    node.data = aggregate(node.data, "ambiente").sort(function(a, b) {
      if (a.ambiente < b.ambiente) {
        return -1;
      }
      if (a.ambiente > b.ambiente) {
        return 1;
      }
      return 0;
    });
  });

  console.log(hierarchy);
  const comparisonData = [];
  const bootstatistic = (arr1, arr2) => d3.mean(arr2) - d3.mean(arr1);

  for (let taskData of hierarchy) {
    const tarefa = taskData.tarefa;
    const scenarioData = taskData.data;
    for (let i = 0; i < scenarioData.length; i++) {
      for (let k = i + 1; k < scenarioData.length; k++) {
        const g1 = scenarioData[i].data.map(d => d["tempo"]);
        const g2 = scenarioData[k].data.map(d => d["tempo"]);

        console.log(
          `comparando ambiente ${scenarioData[i].ambiente} com ${scenarioData[k].ambiente} na tarefa ${tarefa}`
        );
        console.log(`media ${scenarioData[i].ambiente}: ${d3.mean(g1)}`);
        console.log(`media ${scenarioData[k].ambiente}: ${d3.mean(g2)}`);
        const pair = scenarioData[i].ambiente + "-" + scenarioData[k].ambiente;
        console.log(pair);

        let bootvalues = [];
        for (let b = 0; b <= 100; b++) {
          const n_samples = Math.min(g1.length, g2.length);
          const values1 = new Array(n_samples)
            .fill(0)
            .map(() => random(g1.length))
            .map(d => g1[d]);
          const values2 = new Array(n_samples)
            .fill(0)
            .map(() => random(g2.length))
            .map(d => g2[d]);
          const diff = bootstatistic(values1, values2);
          bootvalues.push(diff);
        }

        bootvalues.sort((a, b) => a - b);
        const low95 = d3.quantile(bootvalues, 0.025);
        const up95 = d3.quantile(bootvalues, 0.975);
        const low50 = d3.quantile(bootvalues, 0.25);
        const up50 = d3.quantile(bootvalues, 0.75);
        const sampledMeanDiff = d3.mean(bootvalues);
        console.log(low95, up95);

        const trueMeanDiff = d3.mean(g2) - d3.mean(g1);
        const pooledStd = getPooledStd(g1, g2);
        comparisonData.push({
          pair,
          tarefa,
          low95,
          up95,
          low50,
          up50,
          trueMeanDiff,
          sampledMeanDiff,
          pooledStd
        });
      }
    }
  }

  console.log(comparisonData);

  for (let tarefa = 1; tarefa <= 13; tarefa++) {
    const width = 400;
    const height = 200;
    const margin = { top: 20, bottom: 30, right: 10, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const containerHeight = innerHeight / 3;
    const data = comparisonData.filter(d => d.tarefa === tarefa);
    const svg = d3
      .select("body")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxup = d3.max(data, d => Math.abs(d.up95));
    const maxlow = d3.max(data, d => Math.abs(d.low95));
    const max = Math.max(maxup, maxlow);
    const x = d3
      .scaleLinear()
      .domain([-1.1 * max, 1.1 * max])
      .range([0, innerWidth]);

    svg
      .append("g")
      .classed("xaxis", true)
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5));

    svg
      .append("rect")
      .attr("height", innerHeight)
      .attr("width", innerWidth)
      .attr("fill", "snow")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    svg
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -3)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "baseline")
      .text(`Task ${tarefa}`);

    const order = ["A-B", "B-C", "A-C"];
    const container = svg
      .selectAll("g.container")
      .data(data)
      .join("g")
      .classed("container", true)
      .attr(
        "transform",
        d => `translate(0,${order.indexOf(d.pair) * containerHeight})`
      );

    container
      .append("rect")
      .classed("nosizeright", true)
      .attr("x", x(0))
      .attr("width", d =>
        x(0.2 * d.pooledStd) - x(0) > 0 ? x(0.2 * d.pooledStd) - x(0) : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "lightgray")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);

    container
      .append("rect")
      .classed("smallsizeright", true)
      .attr("x", d => x(0.2 * d.pooledStd))
      .attr("width", d =>
        x(0.5 * d.pooledStd) - x(0.2 * d.pooledStd) > 0
          ? x(0.5 * d.pooledStd) - x(0.2 * d.pooledStd)
          : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "mediumseagreen")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);
    container
      .append("rect")
      .classed("mediumsizeright", true)
      .attr("x", d => x(0.5 * d.pooledStd))
      .attr("width", d =>
        x(0.8 * d.pooledStd) - x(0.5 * d.pooledStd) > 0
          ? x(0.8 * d.pooledStd) - x(0.5 * d.pooledStd)
          : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "gold")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);
    container
      .append("rect")
      .classed("largesizeright", true)
      .attr("x", d => x(0.8 * d.pooledStd))
      .attr("width", d =>
        innerWidth - x(0.8 * d.pooledStd) > 0
          ? innerWidth - x(0.8 * d.pooledStd)
          : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "darkred")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);

    container
      .append("rect")
      .classed("nosizeleft", true)
      .attr("width", d =>
        x(0.2 * d.pooledStd) - x(0) > 0 ? x(0.2 * d.pooledStd) - x(0) : 0
      )
      .attr("x", d => x(0) - (x(0.2 * d.pooledStd) - x(0)))
      .attr("height", containerHeight)
      .attr("fill", "lightgray")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);

    container
      .append("rect")
      .classed("smallsizeleft", true)
      .attr("x", d => x(-0.5 * d.pooledStd))
      .attr("width", d =>
        x(0.5 * d.pooledStd) - x(0.2 * d.pooledStd) > 0
          ? x(0.5 * d.pooledStd) - x(0.2 * d.pooledStd)
          : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "mediumseagreen")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);

    container
      .append("rect")
      .classed("mediumsizeleft", true)
      .attr("x", d => x(-0.8 * d.pooledStd))
      .attr("width", d =>
        x(0.8 * d.pooledStd) - x(0.5 * d.pooledStd) > 0
          ? x(0.8 * d.pooledStd) - x(0.5 * d.pooledStd)
          : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "gold")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);

    container
      .append("rect")
      .classed("largesizeright", true)
      .attr("x", d => 0)
      .attr("width", d =>
        x(-0.8 * d.pooledStd) > 0 ? x(-0.8 * d.pooledStd) : 0
      )
      .attr("height", containerHeight)
      .attr("fill", "darkred")
      .attr("pooled", d => d.pooledStd)
      .attr("diff", d => d.trueMeanDiff)
      .attr("opacity", 0.3);

    container
      .append("line")
      .attr("x1", d => 0)
      .attr("x2", d => innerWidth)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    container
      .append("line")
      .attr("x1", d => x(0))
      .attr("x2", d => x(0))
      .attr("y1", -1)
      .attr("y2", containerHeight + 1)
      .attr("stroke-width", 1)
      .attr("stroke", "black")
      .attr("stroke-dasharray", 3)
      .attr("opacity", 0.7);

    container
      .append("line")
      .attr("x1", d => x(d.low95))
      .attr("x2", d => x(d.up95))
      .attr("y1", containerHeight / 2)
      .attr("y2", containerHeight / 2)
      .attr("stroke-width", 1)
      .attr("stroke", "black");
    container
      .append("line")
      .attr("x1", d => x(d.low95))
      .attr("x2", d => x(d.low95))
      .attr("y1", 0.25 * containerHeight)
      .attr("y2", 0.75 * containerHeight)
      .attr("stroke-width", 1)
      .attr("stroke", "black");
    container
      .append("line")
      .attr("x1", d => x(d.up95))
      .attr("x2", d => x(d.up95))
      .attr("y1", 0.25 * containerHeight)
      .attr("y2", 0.75 * containerHeight)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    container
      .append("line")
      .attr("x1", d => x(d.low50))
      .attr("x2", d => x(d.low50))
      .attr("y1", 0.4 * containerHeight)
      .attr("y2", 0.6 * containerHeight)
      .attr("stroke-width", 1)
      .attr("stroke", "black");
    container
      .append("line")
      .attr("x1", d => x(d.up50))
      .attr("x2", d => x(d.up50))
      .attr("y1", 0.4 * containerHeight)
      .attr("y2", 0.6 * containerHeight)
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    container
      .append("circle")
      .attr("cx", d => x(d.sampledMeanDiff))
      .attr("cy", containerHeight / 2)
      .attr("r", containerHeight * 0.05);

    container
      .append("rect")
      .classed("clip", true)
      .attr("x", -10 - margin.left)
      .attr("height", containerHeight + 2)
      .attr("width", 10 + margin.left)
      .attr("fill", "white");

    container
      .append("rect")
      .classed("clip", true)
      .attr("x", innerWidth)
      .attr("height", containerHeight + 2)
      .attr("width", 10)
      .attr("fill", "white");

    container
      .append("text")
      .attr("x", -5)
      .attr("y", containerHeight / 2)
      .attr("alignment-baseline", "middle")
      .attr("text-anchor", "end")
      .text(d => d.pair);
  }
});

function aggregate(objects, key) {
  const dict = {};
  const levels = [...new Set(objects.map(d => d[key]))];
  for (let object of objects) {
    if (!dict.hasOwnProperty(object[key])) dict[object[key]] = [];
    dict[object[key]].push(object);
  }
  const data = [];
  for (level of levels) {
    data.push({
      [key]: level,
      data: dict[level]
    });
  }
  return data;
}

function random(max) {
  min = 0;
  max = Math.floor(max) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPooledStd(arr1, arr2) {
  const std1 = d3.deviation(arr1);
  const std2 = d3.deviation(arr2);
  return Math.sqrt((std1 * std1 + std2 * std2) / 2);
}

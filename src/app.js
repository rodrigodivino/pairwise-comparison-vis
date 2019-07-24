import { cleanData, bootComparison, getPooledStd } from "./utils.js";
/* global d3 */

d3.csv("../data/dadosAnderson.csv", cleanData).then(data => {
  const width = 400;
  const height = 2000;
  const margin = { top: 10, left: 10, right: 10, bottom: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const plot = d3
    .select("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const rootContainerPad = 15;
  const rootContainerWidth = innerWidth;
  const rootContainerHeight = innerHeight / 13 - rootContainerPad;

  const rootContainers = plot
    .selectAll("g.rootContainer")
    .data(
      [1, 3, 2, 5, 4, 6, 7, 8, 9, 10, 11, 12, 13].map(d =>
        data.filter(e => e.task === d)
      )
    )
    .join("g")
    .attr(
      "transform",
      (_, i) => `translate(0,${i * (rootContainerHeight + rootContainerPad)})`
    );

  rootContainers
    .append("rect")
    .attr("width", rootContainerWidth)
    .attr("height", rootContainerHeight)
    .attr("fill", "none")
    .attr("stroke", "black");

  const comparisonContainerWidth = rootContainerWidth;
  const comparisonContainerHeight = rootContainerHeight / 3;
  const comparisonContainers = rootContainers
    .selectAll("g.comparisonContainer")
    .data(taskArr =>
      ["A,B", "B,C", "A,C"].map(tag => {
        const [term1, term2] = tag.split(",");
        return {
          term1: taskArr.filter(e => e.group === term1),
          term2: taskArr.filter(e => e.group === term2)
        };
      })
    )
    .join("g")
    .attr(
      "transform",
      (_, i) => `translate(0,${i * comparisonContainerHeight})`
    )
    .classed("comparisonContainer", true);

  comparisonContainers
    .append("rect")
    .attr("width", comparisonContainerWidth)
    .attr("height", comparisonContainerHeight)
    .attr("fill", "none")
    .attr("stroke", "none");

  comparisonContainers.each(function({ term1, term2 }) {
    const arr1 = term1.map(d => d["duration"]);
    const arr2 = term2.map(d => d["duration"]);

    const comp = bootComparison(arr1, arr2);
    d3.select(this).attr("meanDiff", comp.mean);
    d3.select(this).attr("lowerCI", comp.ci[0]);
    d3.select(this).attr("upperCI", comp.ci[1]);
  });

  rootContainers.each(function() {
    const rootContainer = d3.select(this);
    let minValidAbsCis = [];
    const fallBackForNonValids = [];
    rootContainer.selectAll("g.comparisonContainer").each(function() {
      const lowerCI = parseFloat(d3.select(this).attr("lowerCI"));
      const upperCI = parseFloat(d3.select(this).attr("upperCI"));
      const minAbsCI = d3.min([Math.abs(lowerCI), Math.abs(upperCI)]);
      if (Math.sign(lowerCI) === Math.sign(upperCI)) {
        minValidAbsCis.push(minAbsCI);
      }
      fallBackForNonValids.push(minAbsCI);
    });

    if (minValidAbsCis.length === 0) {
      minValidAbsCis = fallBackForNonValids;
    }
    const maxCloserCi = d3.max(minValidAbsCis, Math.abs);
    const x = d3
      .scaleLinear()
      .domain([-maxCloserCi * 1.4, maxCloserCi * 1.4])
      .range([0, comparisonContainerWidth]);

    rootContainer
      .append("line")
      .classed("zero", true)
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", 0)
      .attr("y2", rootContainerHeight)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", 0);

    rootContainer
      .selectAll("g.comparisonContainer")
      .each(function({ term1, term2 }) {
        const arr1 = term1.map(d => d["duration"]);
        const arr2 = term2.map(d => d["duration"]);
        const comparisonContainer = d3.select(this);
        const lowerCI = parseFloat(comparisonContainer.attr("lowerCI"));
        const upperCI = parseFloat(comparisonContainer.attr("upperCI"));

        const pooledStd = getPooledStd(arr1, arr2);

        comparisonContainer
          .append("rect")
          .classed("nosizeright", true)
          .attr("x", x(0))
          .attr("width", () => {
            if (x(0.2 * pooledStd) - x(0) < 0) {
              return 0;
            } else if (x(0.2 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0);
            } else {
              return x(0.2 * pooledStd) - x(0);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][0])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("nosizeleft", true)
          .attr("x", () => {
            if (x(0.2 * pooledStd) - x(0) < 0) {
              return x(0) - 0;
            } else if (x(0.2 * pooledStd) > comparisonContainerWidth) {
              return x(0) - (comparisonContainerWidth - x(0));
            } else {
              return x(0) - (x(0.2 * pooledStd) - x(0));
            }
          })
          .attr("width", () => {
            if (x(0.2 * pooledStd) - x(0) < 0) {
              return 0;
            } else if (x(0.2 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0);
            } else {
              return x(0.2 * pooledStd) - x(0);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][0])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("smallsizeright", true)
          .attr("x", x(0.2 * pooledStd) - 1)
          .attr("width", () => {
            if (x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0) {
              return 0;
            } else if (x(0.5 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.2 * pooledStd);
            } else {
              return x(0.5 * pooledStd) - x(0.2 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][1])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("smallsizeleft", true)
          .attr("x", () => {
            if (x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0) {
              return x(-(0.2 * pooledStd)) - 0;
            } else if (x(0.5 * pooledStd) > comparisonContainerWidth) {
              return (
                x(-(0.2 * pooledStd)) -
                (comparisonContainerWidth - x(0.2 * pooledStd))
              );
            } else {
              return (
                x(-(0.2 * pooledStd)) -
                (x(0.5 * pooledStd) - x(0.2 * pooledStd))
              );
            }
          })
          .attr("width", () => {
            if (x(0.5 * pooledStd) - x(0.2 * pooledStd) < 0) {
              return 0;
            } else if (x(0.5 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.2 * pooledStd);
            } else {
              return x(0.5 * pooledStd) - x(0.2 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][1])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("mediumsizeright", true)
          .attr("x", x(0.5 * pooledStd) - 1)
          .attr("width", () => {
            if (x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0) {
              return 0;
            } else if (x(0.8 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.5 * pooledStd);
            } else {
              return x(0.8 * pooledStd) - x(0.5 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][2])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("mediumsizeleft", true)
          .attr("x", () => {
            if (x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0) {
              return x(-(0.5 * pooledStd)) - 0;
            } else if (x(0.8 * pooledStd) > comparisonContainerWidth) {
              return (
                x(-(0.5 * pooledStd)) -
                (comparisonContainerWidth - x(0.5 * pooledStd))
              );
            } else {
              return (
                x(-(0.5 * pooledStd)) -
                (x(0.8 * pooledStd) - x(0.5 * pooledStd))
              );
            }
          })
          .attr("width", () => {
            if (x(0.8 * pooledStd) - x(0.5 * pooledStd) < 0) {
              return 0;
            } else if (x(0.8 * pooledStd) > comparisonContainerWidth) {
              return comparisonContainerWidth - x(0.5 * pooledStd);
            } else {
              return x(0.8 * pooledStd) - x(0.5 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][2])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("largesizeright", true)
          .attr("x", x(0.8 * pooledStd) - 1)
          .attr("width", () => {
            if (comparisonContainerWidth - x(0.8 * pooledStd) < 0) {
              return 0;
            } else {
              return comparisonContainerWidth - x(0.8 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][3])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        comparisonContainer
          .append("rect")
          .classed("largesizeleft", true)
          .attr("x", () => {
            if (comparisonContainerWidth - x(0.8 * pooledStd) < 0) {
              return x(-(0.8 * pooledStd)) - 0;
            } else {
              return (
                x(-(0.8 * pooledStd)) -
                (comparisonContainerWidth - x(0.8 * pooledStd))
              );
            }
          })
          .attr("width", () => {
            if (comparisonContainerWidth - x(0.8 * pooledStd) < 0) {
              return 0;
            } else {
              return comparisonContainerWidth - x(0.8 * pooledStd);
            }
          })
          .attr("height", comparisonContainerHeight / 2)
          .attr("y", comparisonContainerHeight / 4)
          .attr("fill", d3.schemeYlGnBu[4][3])
          .attr("pooled", d => d.pooledStd)
          .attr("diff", d => d.trueMeanDiff);

        const g = comparisonContainer
          .selectAll("g.ci")
          .data([{ lowerCI, upperCI }])
          .join("g")
          .classed("ci", true);

        g.each(function({ lowerCI, upperCI }) {
          const rect = d3.select(this).append("rect");
          const blocker1 = d3.select(this).append("rect");
          const blocker2 = d3.select(this).append("rect");
          const text = d3.select(this).append("text");
          const xPos = x(lowerCI) < 0 ? 0 : x(lowerCI);
          const rectWidth =
            x(upperCI) > comparisonContainerWidth
              ? comparisonContainerWidth - xPos
              : x(upperCI) - xPos;

          const tag = term1[0].group + " x " + term2[0].group;
          rect
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("fill-opacity", 1)
            .attr("x", xPos)
            .attr("width", rectWidth)
            .attr("height", comparisonContainerHeight);

          blocker1
            .attr("fill", "white")
            .attr("stroke", "none")
            .attr("y", 1)
            .attr("height", comparisonContainerHeight - 2)
            .attr("x", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                return x(upperCI) + 0.5;
              } else if (upperCI < 0) {
                return x(0) + 0.5;
              } else {
                return x(upperCI) + 0.5;
              }
            })
            .attr("width", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                const width = comparisonContainerWidth - x(upperCI);
                return (width < 0 ? 0 : width) - 1;
              } else if (upperCI < 0) {
                return comparisonContainerWidth - x(0) - 1;
              } else {
                const width = comparisonContainerWidth - x(upperCI);
                return (width > 0 ? width : 0) - 1;
              }
            });

          blocker2
            .attr("fill", "white")
            .attr("stroke", "none")
            .classed("blocker2", true)
            .attr("y", 1)
            .attr("height", comparisonContainerHeight - 2)
            .attr("x", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                return 0 + 0.5;
              } else if (lowerCI > 0) {
                return 0 + 0.5;
              } else {
                return 0 + 0.5;
              }
            })
            .attr("width", function() {
              if (Math.sign(upperCI) !== Math.sign(lowerCI)) {
                const width = x(lowerCI) < 0 ? 0 : x(lowerCI);
                console.log(width);
                return (width < 0 ? 0 : width) - 1;
              } else if (lowerCI > 0) {
                return x(0) - 1;
              } else {
                return x(lowerCI) - 1;
              }
            });

          text
            .attr("x", xPos + rectWidth / 2)
            .attr("y", comparisonContainerHeight / 2)
            .attr("alignment-baseline", "middle")
            .attr("text-anchor", "middle")
            .text(tag);
        });
      });
  });
});

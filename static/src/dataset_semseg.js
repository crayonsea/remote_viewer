/**
 * dataset_segseg
 *  - datasetname
 *    -- labels: all label names in this dataset
 *    -- colors: same order to `labels` list order
 *    -- name2class: name mapping to ID in ply
 *    -- class2name: ID in ply mapping to name
 */
const dataset_semseg = {
  "s3dis": {
    "labels": [
      "ceiling", "floor", "wall", "beam", "column", "window", "door", "table", "chair", "sofa",
      "bookcase", "board", "clutter"
    ],
    "colors": [
      "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000",
      "#000000", "#000000", "#000000"
    ],
    "mapping": [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
    ],
  },
  "scannet": {
    "labels": [
      "unannotated", "wall", "floor", "chair", "table", "desk", "bed", "bookshelf", "sofa", "sink", 
      "bathtub", "toilet", "curtain", "counter", "door", "window", "shower curtain", "refridgerator", "picture", "cabinet", 
      "otherfurniture"
    ],
    "colors": [
      "#000000", "#aec6e8", "#97df89", "#bcbd22", "#ff9897", "#f7b7d2", "#ffbc78", "#9467bc", "#8c564a", "#708090",
      "#e377c2", "#2ba02d", "#dadb8d", "#17bed0", "#d52728", "#c4b0d5", "#9edae5", "#fe7f0e", "#c49c94", "#1f78b4",
      "#5253a3"
    ],
    "mapping": [
      0, 1, 2, 5, 7, 14, 4, 10, 6, 34, 36, 33, 16, 12, 8, 9, 28, 24, 11, 3, 39
    ],
  }
}

for (let dataset_name in dataset_semseg) {
  const labels = dataset_semseg[dataset_name]['labels'];
  const mapping = dataset_semseg[dataset_name]['mapping'];
  const name2class = {}, class2name = {};
  for (let i = 0; i < labels.length; i++) {
    name2class[labels[i]] = mapping[i];
    class2name[mapping[i]] = labels[i];
  }
  dataset_semseg[dataset_name]['name2class'] = name2class;
  dataset_semseg[dataset_name]['class2name'] = class2name;
}

export { dataset_semseg };

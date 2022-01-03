module.exports = {
  /**
 * 将输入的数字 num 转换为 ',' 分隔的格式化字符串;
 * 如 1234567 -> '1,234,567'
 * @param {*} num 
 */
  formatNumber: function(num, split_num=3) {
    const str_num = num.toString();
    let x_pos = str_num.length % split_num;
    let res = [];
    if (x_pos != 0) { res.push(str_num.slice(0, x_pos)); }
    for (let i = x_pos; i < str_num.length; i += split_num) {
      res.push(str_num.slice(i, i + split_num));
    }
    return res.join(',');
  },

  /**
   * 将 array [gt_1, pred_1, gt_2, pred_2, ..., gt_N, pred_N]
   * 的数据计算 acc 指标 (%)
   * @param {*} arr 
   * @param {*} ignore 需要忽略的 GT 标签
   */
  metrics_acc: function(arr, ignore=-1) {
    let total_num = arr.length / 2;
    let equal_num = 0, ignore_num = 0;
    for (let i = 0; i < arr.length; i+=2) {
      let gt = arr[i];
      let pred = arr[i+1];
      if (gt == ignore) {
        ignore_num += 1;
      } else {
        equal_num += (gt == pred);
      }
    }
    let acc = equal_num / (total_num - ignore_num)
    return acc * 100;
  },

}

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
  
}

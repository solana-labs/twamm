import anchor from "@project-serum/anchor";

anchor.BN.prototype.toJSON = function () {
  return this.toString(10);
};

export default anchor.BN;

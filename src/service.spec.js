import { expect } from "chai";
import { stub } from "sinon";
import _ from "lodash";
import axios from "axios";
import { bondsReport, MOEXsearchVolume, formatBondReport } from "./service.js";

import { results } from "../fixtures/results.js";
import { testBonds } from "../fixtures/bonds.js";
import { boardIds } from "../fixtures/boardId.js";
import { volumes } from "../fixtures/volumes.js";
import { coupons } from "../fixtures/coupons.js";

describe("service", function () {
  let axiosStub;
  beforeEach(() => {
    axiosStub = stub(axios, "get");
  });
  afterEach(() => {
    axiosStub.restore();
  });

  it("should get check bond volumes", async () => {
    axiosStub.onCall(0).resolves(Promise.resolve({ data: boardIds })); //board ids
    axiosStub.onCall(1).resolves(Promise.resolve({ data: volumes })); //volumes

    const volume = await MOEXsearchVolume("RU000A0ZYCZ4", 400);

    expect(volume.lowLiquid).to.equal(0);
    expect(volume.value).to.equal(27645);
  });
  it("should get bounds report", async () => {
    axiosStub.onCall(0).resolves(Promise.resolve({ data: testBonds }));
    axiosStub.onCall(1).resolves(Promise.resolve({ data: boardIds }));
    axiosStub.onCall(2).resolves(Promise.resolve({ data: volumes }));
    axiosStub.onCall(3).resolves(Promise.resolve({ data: coupons }));

    const report = await bondsReport(58);
    console.log("-----", report);
    expect(report.length).to.equal(1);
    expect(report[0].sec).to.equal(testBonds.securities.data[1][0]);
  });
  it("should get table report", () => {
    // const rep = await bondsReport(58);
    // const rep = await MOEXsearchVolume('RU000A0ZYCZ4', 400);
    let bonds = _.orderBy(results, "volume", "desc");
    bonds = _.take(bonds, 40);
    const result = formatBondReport(bonds);
    console.log(result);
    expect(
      result.includes(
        "МЭФ Московской обл. 2016       | 101.75 |  8.05 |    10.76 | 111965 |"
      )
    ).to.equal(true);
  });
});

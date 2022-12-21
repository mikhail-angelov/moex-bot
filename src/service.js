import axios from "axios";
import dayjs from "dayjs";
import _ from "lodash";
import { AsciiTable3 } from "ascii-table3";

const YieldMore = 7; //Доходность больше этой цифры
const YieldLess = 40; //Доходность меньше этой цифры
const PriceMore = 60; //Цена больше этой цифры
const PriceLess = 110; //Цена меньше этой цифры
const DurationMore = 6; //Дюрация больше этой цифры
const DurationLess = 13; //Дюрация меньше этой цифры
const VolumeMore = 400; //Объем сделок в каждый из n дней, шт. больше этой цифры
const BondVolumeMore = 10000; // Совокупный объем сделок за n дней, шт. больше этой цифры

const mapBonds = (response) => {
  const { marketdata, securities } = response;
  return securities.data.map((bond, index) => {
    let sec = bond[0];
    let name = bond[1].replace(/\"/g, "").replace(/\'/g, "");
    let price = bond[2];
    let byield = marketdata.data[index][1];
    let duration = Math.floor((marketdata.data[index][2] / 30) * 100) / 100; // кол-во оставшихся месяцев
    return { sec, name, price, byield, duration };
  });
};

export const formatBondReport = (bonds) => {
  const table = new AsciiTable3()
    .setHeading("name", "price", "yield", "duration", "volume", "months")
    .addRowMatrix(
      bonds.map(({ name, price, byield, duration, volume, dates }) => [
        name,
        price,
        byield,
        duration,
        volume,
        dates,
      ])
    );
    console.log(table.toString())
  return table.toString();
};

export const bondsReport = async (group) => {
  let bonds = [];
  const url = `https://iss.moex.com/iss/engines/stock/markets/bonds/boardgroups/${group}/securities.json?iss.dp=comma&iss.meta=off&iss.only=securities,marketdata&securities.columns=SECID,SECNAME,PREVLEGALCLOSEPRICE&marketdata.columns=SECID,YIELD,DURATION`;
  // console.log(`. Ссылка поиска всех доступных облигаций группы: ${url}.`);
  try {
    const response = await axios.get(url);
    let bondList = mapBonds(response.data);
    console.log(" Всего в списке: %s бумаг.", bondList.length);
    const validBonds = bondList.filter(({ byield, price, duration }) => {
      return (
        byield > YieldMore &&
        byield < YieldLess &&
        price > PriceMore &&
        price < PriceLess &&
        duration > DurationMore &&
        duration < DurationLess
      );
    });
    console.log("count: ", validBonds.length);
    const bondsWithValues = await Promise.all(
      validBonds.map(async (bond) => {
        let { value, lowLiquid } = await MOEXsearchVolume(bond.sec, VolumeMore);
        return { ...bond, volume: value || 0, lowLiquid };
      })
    );

    const bondsTop = bondsWithValues.filter((bond) => {
      return bond.lowLiquid == 0 && bond.volume > BondVolumeMore;
    });
    console.log("count 2:", bondsTop.length);
    const bondsWithPayments = await Promise.all(
      bondsTop.map(async (bond) => {
        let payment = await MOEXsearchMonthsOfPayments(bond.sec);
        return {
          ...bond,
          unknownDates: payment.unknownDates,
          dates: payment.formattedDates,
        };
      })
    );

    bonds = bondsWithPayments.filter((bond) => {
      return bond.unknownDates === 0;
    });
    console.log("count 3:", bonds.length);
  } catch (e) {
    console.log(`Ошибка в : ${e}.`);
  }

  // сортировка по объему сделок за n дней, шт.
  bonds = _.orderBy(bonds, "volume", "desc");
  bonds = _.take(bonds, 20);
  return bonds;
};

const MOEXboardID = async (ID) => {
  const url = `https://iss.moex.com/iss/securities/${ID}.json?iss.meta=off&iss.only=boards&boards.columns=secid,boardid,is_primary`;
  try {
    const response = await axios.get(url);
    let boardID = response.data.boards.data.find((e) => e[2] === 1)[1];
    return boardID;
  } catch (e) {
    console.log("Ошибка в", e);
  }
};
export const MOEXsearchVolume = async (ID, thresholdValue) => {
  let DateRequestPrevious = dayjs().subtract(15, "days").format("YYYY-MM-DD"); // `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate() - 15}`; //этот день n дней назад
  const boardID = await MOEXboardID(ID);
  if (!boardID) {
    return {
      lowLiquid: 0,
      value: 0,
    };
  }
  const url = `https://iss.moex.com/iss/history/engines/stock/markets/bonds/boards/${boardID}/securities/${ID}.json?iss.meta=off&iss.only=history&history.columns=SECID,TRADEDATE,VOLUME,NUMTRADES&limit=20&from=${DateRequestPrevious}`;
  // numtrades - Минимальное количество сделок с бумагой
  // VOLUME - оборот в количестве бумаг (Объем сделок, шт)
  // console.log("Ссылка для поиска объёма сделок %s: %s", ID, url);
  var volume_sum = 0;
  var lowLiquid = 0;
  try {
    const response = await axios.get(url);
    let list = response.data.history.data;
    let count = list.length;

    for (var i = 0; i <= count - 1; i++) {
      let volume = list[i][2];
      volume_sum += volume;
      if (thresholdValue > volume) {
        // если оборот в конкретный день меньше
        lowLiquid = 1;
        // console.log(
        //   ` На ${i + 1}-й день (${
        //     list[i][1]
        //   }) из ${count} оборот по бумаге ${ID} меньше чем ${thresholdValue}: ${volume} шт.`
        // );
      }
      if (count < 6) {
        // если всего дней в апи на этом периоде очень мало
        lowLiquid = 1;
        // console.log(
        //   ` Всего в АПИ Мосбиржи доступно ${count} дней, а надо хотя бы больше 6 торговых дней с ${DateRequestPrevious}!`
        // );
      }
    }
    if (lowLiquid != 1) {
      // console.log(
      //   ` Во всех ${count} днях оборот по бумаге ${ID} был больше, чем ${thresholdValue} шт каждый день.`
      // );
    }
    // console.log(
    //   ` Итоговый оборот в бумагах (объем сделок, шт) за ${count} дней: ${volume_sum} шт нарастающим итогом.`
    // );
  } catch (e) {
    console.log("Ошибка в ", e);
  }
  return {
    lowLiquid: lowLiquid,
    value: volume_sum,
  };
};
const MOEXsearchMonthsOfPayments = async (ID) => {
  const url = `https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/${ID}.json?iss.meta=off&iss.only=coupons`;
  // для бумаг с большим количеством выплат АПИ выводит только первые 19 выплат, например:
  // https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/RU000A100CG7
  // https://bonds.finam.ru/issue/details0251800002/default.asp
  let formattedDates = "";
  var unknownDates = 0;
  let uniqueDates = [];
  // console.log(` Ссылка для поиска месяцев выплат для ${ID}: ${url}.`);
  try {
    const response = await axios.get(url);
    const coupons = response.data.coupons;
    var couponDates = [];

    for (var i = 0; i <= coupons.data.length - 1; i++) {
      let coupondate = coupons.data[i][3]; // даты купона
      let value_rub = coupons.data[i][9]; // сумма выплаты купона
      let inFuture = new Date(coupondate) > new Date();
      if (inFuture == true) {
        couponDates.push(+coupondate.split("-")[1]);
        // console.log(` Купон для ${ID} выплачивается в месяц ${JSON.stringify(couponDates[couponDates.length - 1])} (строка ${couponDates.length}).`)
        // console.log(` Для ${ID} выплата ${coupondate} в размере ${value_rub} руб.`)
        if (value_rub == null) {
          unknownDates += 1;
        }
      }
    }
    if (unknownDates > 0) {
      // console.log(
      //   ` Для ${ID} есть ${unknownDates} дат(ы) будущих платежей с неизвестным значением выплат.`
      // );
    }
    uniqueDates = [...new Set(couponDates)]; // уникальные значения месяцев
    uniqueDates = uniqueDates.sort(function (a, b) {
      return a - b;
    });
    // console.log(` Купоны для ${ID} выплачиваются в ${uniqueDates} месяцы.`);
    for (let y = 1; y < 13; y++) {
      formattedDates += uniqueDates.includes(y) ? `${y}` : `–––`;
      formattedDates += y == 12 ? `` : `-`; // -
    }
    formattedDates = formattedDates
      .replace(/^1-/g, "янв-")
      .replace(/2-/g, "фев-")
      .replace(/3-/g, "мар-")
      .replace(/4-/g, "апр-")
      .replace(/5-/g, "май-")
      .replace(/6-/g, "июн-")
      .replace(/7-/g, "июл-")
      .replace(/8-/g, "авг-")
      .replace(/9-/g, "сен-")
      .replace(/10-/g, "окт-")
      .replace(/11-/g, "ноя-")
      .replace(/12/g, "-дек");
    // console.log(` Сформатированная строка вывода в которой есть месяцы выплат: ${formattedDates}.`)
  } catch (e) {
    console.log("Ошибка в %s", e);
  }
  return {
    formattedDates: uniqueDates.join(", "),
    unknownDates,
  };
};

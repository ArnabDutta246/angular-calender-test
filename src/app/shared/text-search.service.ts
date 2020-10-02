import { Injectable } from "@angular/core";
import treebank from "talisman/tokenizers/words/treebank";
import doubleMetaphone from "talisman/phonetics/double-metaphone";
@Injectable({
  providedIn: "root",
})
export class TextSearchService {
  constructor() {}
  tokenizeText(text: string) {
    // This will retrun the tokenized array of strings
    // casual('Dummy #text for search');=>['Dummy','#text','for','search']
    return treebank(text);
  }
  getDoubleMetaphone(text: string) {
    // Create two elemnts (doubleMetaphone) of the text
    // doubleMetaphone('Smith'); >>> ['SM0', 'XMT']
    return doubleMetaphone(text);
  }
  createSearchMap(text: string) {
    // console.log('createSearchMap',text);
    let searchMap = { matchAny: [] };
    let textTokens = this.tokenizeText(text);
    textTokens.forEach((tt, i) => {
      // console.log('createSearchMap textTokens',t);
      // Note: Pure numbers are not given any doubleMetaphone values
      // Open question whether to include such cases for searchMap

      // Replace any '.' (dot) with '_' (underscore) to avoid conflict with
      // attribute access <attribute>.<attr>.<attr>
      let t = tt.replace(/[.]/g, "_").toLowerCase();
      let doubleMetaphones = this.getDoubleMetaphone(t);
      doubleMetaphones.forEach((d, j) => {
        // console.log('createSearchMap doubleMetaphones',t,d);
        if (d || (t && t.length > 1)) {
          searchMap[d ? d : t] = true;
          if (!searchMap.matchAny.includes(d ? d : t)) {
            searchMap.matchAny.push(d ? d : t);
          }
        }
      });
    });
    return searchMap;
  }

  getSearchMapQuery(
    collectionRef: any,
    seachField: string,
    text: any,
    searchOption: any = "all"
  ) {
    let textTokens = this.tokenizeText(text);
    let searchany = [];
    textTokens.forEach((tt, i) => {
      // Replace any '.' (dot) with '_' (underscore) to avoid conflict with
      // attribute access <attribute>.<attr>.<attr>
      let t = tt.replace(/[.]/g, "_").toLowerCase();
      let doubleMetaphones = this.getDoubleMetaphone(t);
      // Note: Pure numbers are not given any doubleMetaphone values
      // Open question whether to include such cases for searchMap

      // if searchOption 'any', then add both the distinct metaphone, if any
      if (searchOption == "any") {
        doubleMetaphones.forEach((d, j) => {
          if (d || (t && t.length > 1)) {
            if (!searchany.includes(d ? d : t)) {
              searchany.push(d ? d : t);
            }
          }
        });
      } else {
        // append the Query ref with additional filters
        // We are going to use only the fisrt element of double metaphone
        // since firestore does not have any OR query filter
        // This is the best approximation approach for now
        // console.log('search query builder',seachField+'.'+(doubleMetaphones[0] ? doubleMetaphones[0] : t));
        if (doubleMetaphones[0] || (t && t.length > 1)) {
          collectionRef = collectionRef.where(
            seachField + "." + (doubleMetaphones[0] ? doubleMetaphones[0] : t),
            "==",
            true
          );
        }
      }
    });
    if (searchOption == "any") {
      collectionRef = collectionRef.where(
        seachField + ".matchAny",
        "array-contains-any",
        searchany
      );
    }
    // this is the Query ref
    return collectionRef;
  }
}

/// <reference types="@welldone-software/why-did-you-render" />
import React from "react";

if (process.env.NODE_ENV === "development") {
  if (typeof window !== "undefined") {
    const whyDidYouRender = require("@welldone-software/why-did-you-render"); // eslint-disable-line global-require, import/no-extraneous-dependencies, max-len
    whyDidYouRender(React, {
      trackAllPureComponents: true,
    });
  }
}

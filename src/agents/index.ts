// Agent tool registry — exports all tools for the API route

import { medicineSearch } from "./medicine-search";
import { prescriptionHandler } from "./prescription-handler";
import { cartManager } from "./cart-manager";
import { orderManager } from "./order-manager";
import { billGenerator } from "./bill-generator";
import { userPreference } from "./user-preference";
import { orderHistory } from "./order-history";
import { refillManager } from "./refill-manager";

import { paymentVerifier } from "./payment-verifier";
import { warehouseDispatch } from "./warehouse-dispatch";
import { orderTracker } from "./order-tracker";

export const agentTools = {
  medicineSearch,
  prescriptionHandler,
  cartManager,
  orderManager,
  billGenerator,
  userPreference,
  orderHistory,
  refillManager,

  paymentVerifier,
  warehouseDispatch,
  orderTracker,
};

export {
  medicineSearch,
  prescriptionHandler,
  cartManager,
  orderManager,
  billGenerator,
  userPreference,
  orderHistory,
  refillManager,

  paymentVerifier,
  warehouseDispatch,
  orderTracker,
};

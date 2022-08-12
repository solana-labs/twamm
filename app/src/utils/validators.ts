import type { ValidationError, SchemaOf } from "yup";
import { setIn, ValidationErrors } from "final-form";

export const clusterValidator =
  <T>(schema: SchemaOf<unknown>) =>
  async (values: T): Promise<boolean | ValidationErrors> => {
    try {
      await schema.validate(values, { abortEarly: false });
      return true;
    } catch (e) {
      return (e as ValidationError)?.inner.reduce(
        (errors, error) => setIn(errors, error.path || "", error.message),
        {}
      );
    }
  };

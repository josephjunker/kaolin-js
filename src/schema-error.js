
export default class SchemaError {
  constructor(reason, responsibleTypeName) {
    this.reason = reason;
    this.responsibleTypeName = responsibleTypeName;
  }

  get errorMessage() {
    return `An error was found in the schema for type ${this.responsibleTypeName}:\n${this.reason}`;
  }
}


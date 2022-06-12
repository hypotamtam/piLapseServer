import { ValidationChain} from "express-validator"

export interface Controller {
    readonly validationChain: ValidationChain[] 
}
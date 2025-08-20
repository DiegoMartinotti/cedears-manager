// Archivo de ejemplo para probar el sistema de control de calidad
// Este archivo contiene DELIBERADAMENTE errores de calidad para probar el sistema

export class QualityTestExample {
    // Función con complejidad cognitiva alta (violará regla sonarjs/cognitive-complexity: 15)
    public complexFunction(data: any): string {
        const duplicatedString = "Esta es una cadena duplicada que aparecerá múltiples veces";
        
        if (data) {
            if (data.type === "type1") {
                if (data.subtype === "subtype1") {
                    if (data.value > 100) {
                        if (data.category === "A") {
                            if (data.priority === "high") {
                                if (data.status === "active") {
                                    if (data.approved === true) {
                                        if (data.verified === true) {
                                            if (data.processed === false) {
                                                return duplicatedString + " - Caso complejo 1";
                                            } else {
                                                return duplicatedString + " - Ya procesado";
                                            }
                                        } else {
                                            return duplicatedString + " - No verificado";
                                        }
                                    } else {
                                        return duplicatedString + " - No aprobado";
                                    }
                                } else {
                                    return duplicatedString + " - Prioridad no alta";
                                }
                            } else {
                                return duplicatedString + " - Categoría no A";
                            }
                        } else {
                            return duplicatedString + " - Valor no mayor a 100";
                        }
                    } else {
                        return duplicatedString + " - Subtipo no válido";
                    }
                } else {
                    return duplicatedString + " - Tipo no válido";
                }
            } else {
                return duplicatedString + " - Sin data";
            }
        }
        return "Esta es una cadena duplicada que aparecerá múltiples veces";
    }

    // Función idéntica (violará regla sonarjs/no-identical-functions)
    public identicalFunction1(input: string): string {
        const result = input.toUpperCase();
        const processed = result.trim();
        return processed + " - procesado";
    }

    // Función idéntica a la anterior
    public identicalFunction2(input: string): string {
        const result = input.toUpperCase();
        const processed = result.trim();
        return processed + " - procesado";
    }

    // Función con literales duplicados (violará regla sonarjs/no-duplicate-string)
    public functionWithDuplicateStrings(): void {
        console.log("Esta es una cadena duplicada que aparecerá múltiples veces");
        const message1 = "Esta es una cadena duplicada que aparecerá múltiples veces";
        const message2 = "Esta es una cadena duplicada que aparecerá múltiples veces";
        const message3 = "Esta es una cadena duplicada que aparecerá múltiples veces";
        
        if (message1 === message2) {
            console.log("Esta es una cadena duplicada que aparecerá múltiples veces");
        }
    }

    // Función con demasiados parámetros (violará regla max-params)
    public tooManyParameters(
        param1: string,
        param2: number,
        param3: boolean,
        param4: object,
        param5: string[],
        param6: any
    ): void {
        console.log(param1, param2, param3, param4, param5, param6);
    }

    // Función con demasiada profundidad de anidamiento (violará regla max-depth)
    public tooMuchNesting(data: any): string {
        if (data) {
            if (data.level1) {
                if (data.level1.level2) {
                    if (data.level1.level2.level3) {
                        if (data.level1.level2.level3.level4) {
                            if (data.level1.level2.level3.level4.level5) {
                                return "Demasiado anidado";
                            }
                        }
                    }
                }
            }
        }
        return "No anidado";
    }
}
/**
 * Функция для расчета выручки
 * @param {object} purchase - запись о покупке из чека
 * @param {object} _product - карточка товара
 * @returns {number} - выручка
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const discountMultiplier = 1 - (purchase.discount / 100);
    // Итоговая выручка: цена продажи * количество * множитель скидки
    return purchase.sale_price * purchase.quantity * discountMultiplier;
}

/**
 * Функция для расчета бонусов
 * @param {number} index - порядковый номер в отсортированном массиве
 * @param {number} total - общее число продавцов
 * @param {object} seller - карточка продавца
 * @returns {number} - сумма бонуса
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    // 15% для продавца на 1-м месте
    if (index === 0) {
        return profit * 0.15;
    }
    // 10% для 2-го и 3-го места
    if (index === 1 || index === 2) {
        return profit * 0.10;
    }
    // 0% для последнего места
    if (index === total - 1) {
        return 0;
    }
    // 5% для всех остальных
    return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param {object} data
 * @param {object} options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных (Этап 1)
    if (!data ||
        !Array.isArray(data.sellers) || data.sellers.length === 0 ||
        !Array.isArray(data.products) || data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций (Этап 2)
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Не указаны обязательные функции для расчета в options');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики (Этап 3)
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}, // { [sku]: quantity }
    }));
    // @TODO: Индексация продавцов и товаров для быстрого доступа (Этап 4)
    const sellerIndex = sellerStats.reduce((index, seller) => {
        index[seller.id] = seller;
        return index;
    }, {});

    const productIndex = data.products.reduce((index, product) => {
        index[product.sku] = product;
        return index;
    }, {});
    // @TODO: Расчет выручки и прибыли для каждого продавца (Этап 5)
    data.purchase_records.forEach(record => {
        const sellerStat = sellerIndex[record.seller_id];

        // Если по какой-то причине продавец из чека не найден, пропускаем
        if (!sellerStat) return;

        sellerStat.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];

            // Если товар не найден, пропускаем эту позицию
            if (!product) return;

            // Считаем выручку и себестоимость для каждой позиции в чеке
            const itemRevenue = calculateRevenue(item, product);
            const itemCost = product.purchase_price * item.quantity;
            const itemProfit = itemRevenue - itemCost;

            // Накапливаем общую выручку и прибыль продавца
            sellerStat.revenue += itemRevenue;
            sellerStat.profit += itemProfit;

            // Собираем статистику по количеству проданных товаров
            if (!sellerStat.products_sold[item.sku]) {
                sellerStat.products_sold[item.sku] = 0;
            }
            sellerStat.products_sold[item.sku] += item.quantity;
        });
    });
    // @TODO: Сортировка продавцов по прибыли (Этап 6)
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования (Этап 7)
    const finalReport = sellerStats.map((seller, index, allSellers) => {
        // Назначаем бонус
        const bonus = calculateBonus(index, allSellers.length, seller);

        // Формируем топ-10 товаров
        const top_products = Object.entries(seller.products_sold)
            .sort(([, qtyA], [, qtyB]) => qtyB - qtyA) // Сортируем по убыванию количества
            .slice(0, 10) // Берем первые 10
            .map(([sku, quantity]) => ({ sku, quantity })); // Форматируем в нужный вид
        // @TODO: Подготовка итоговой коллекции с нужными полями (Этап 8)
        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: top_products,
            bonus: +bonus.toFixed(2),
        };
    });

    return finalReport;
}

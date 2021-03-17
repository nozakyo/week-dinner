/**
 * 楽天レシピAPIのデータを取得するクラス
 *
 */
class RakutenRecepiAPI {
	constructor (options) {
		this.data = JSON.parse(localStorage.getItem('week-dinner')) || {};
		// カテゴリID一覧
		this.categoryIdList = [31, 32, 33, 14, 15, 16, 17, 23, 10, 11, 38, 39, 41, 42, 43, 44, 25, 46];

		this.$image = $('.' + options.imageClassName);
		this.$time = $('.' + options.timeClassName);
		this.$price = $('.' + options.priceClassName);
		this.$title = $('.' + options.titleClassName);
	}
	/**
	 * 初期設定
	 *
	 * @return {Promise} JSONをdataに保存
	*/
	init () {
		this.getAPIDataOnLoading();
	}
	/**
	 * ページ読み込み時、楽天APIからデータを取得
	 *
	 * @return {Promise} JSONをdataに保存
	*/
	getAPIDataOnLoading () {
		return new Promise((resolve, reject) => {
			// カテゴリIDをセットしてJSON取得
			$.getJSON(this.setURL({isSetId: true}), (result) => {
				// ページ読み込み時の処理
				setTimeout(() => {
					// 短時間に複数回通信するとエラーとなるので少し時間を空ける
					$.getJSON(this.setURL({isSetId: true}), (result2) => {
						const setData = this.setTheSecondData(result.result, result2.result);
						this.updateStorageOnLoading(setData);
						this.updateCassetteContents();
					});
				}, 1000);
			}).catch(() => {
				if (confirm('読み込みに失敗しました。再試行しますか？')) {
					this.getAPIDataOnLoading();
				}
			});
		});
	};
	/**
	 * ページ読み込み時、ローカルストレージにデータをセット
	 *
	 * @return {Promise} JSONをdataに保存
	*/
	updateStorageOnLoading (datas) {
		const newDate = new Date();
		// 今日の1日前の日付に（あとで1日ずつ足していくため）
		newDate.setDate(newDate.getDate() - 1);
		newDate.setHours(0);
		newDate.setMinutes(0);

		// dataの中身がある時（初回以外）
		if (this.data[0] !== undefined) {
			const CALC_DATE = 1000 * 60 * 60 * 24;
			const firstDate = this.data[0]['date'];
			// もともとセットされていた日付
			const oldDate = new Date(firstDate['year'], firstDate['month'], firstDate['date']);
			// セットされていた日付と今日の差分
			const dateDifference = Math.floor((newDate - oldDate) / CALC_DATE);

			// 日付に差があったら
			if (dateDifference > 0) {
				for (let i = 0; i < datas.length; i++) {
					// セットしたい日付に変更
					newDate.setDate(newDate.getDate() + 1);

					if (i + dateDifference < 6) {
						// 新しいデータを上書き
						this.data[i] = this.data[i + dateDifference + 1];
					} else {
						// 新しいデータをセット
						this.data[i] = {
							recipe: datas[i],
							date: {
								year: newDate.getFullYear(),
								month: newDate.getMonth(),
								date: newDate.getDate(),
							}
						};
					}
				}
			}
		// dataの中身がセットされていない時（初回）
		} else {
			// すべてのデータを上書き
			for (let i = 0; i < datas.length; i++) {
				// セットしたい日付
				newDate.setDate(newDate.getDate() + 1);

				// セット
				this.data[i] = {
					recipe: datas[i],
					date: {
						year: newDate.getFullYear(),
						month: newDate.getMonth(),
						date: newDate.getDate(),
					}
				};
			}
		}
		localStorage.setItem('week-dinner', JSON.stringify(this.data));
	}
	/**
	 * 1つ目のデータに、2つ目のデータをセット
	 *
	 * @return {Promise} JSONをdataに保存
	*/
	setTheSecondData (result1, result2) {
		result1[4] = result2[0];
		result1[5] = result2[1];
		result1[6] = result2[2];
		return result1;
	}
	/**
	 * 楽天APIからデータを取得
	 *
	 * @return {Promise} JSONをdataに保存
	*/
	getAPIData (option) {
		return new Promise(() => {
			// カテゴリIDをセットしてJSON取得
			$.getJSON(this.setURL({isSetId: true}), (result) => {
				// 日付を指定の処理
				this.updateStorageAtDate(result.result[this.setRandomNum(4)], option.dateNumber);
			}).catch(() => {
				if (confirm('読み込みに失敗しました。再試行しますか？')) {
					this.ajaxRequest();
				}
			});
		});
	};
	/**
	 * 日付を指定して、ローカルストレージにデータをセット
	 *
	 * @return {Promise} JSONをdataに保存
	*/
	updateStorageAtDate (data, dateNumber) {
		this.data[dateNumber]['recipe'] = data;
		localStorage.setItem('week-dinner', JSON.stringify(this.data));
	}
	/**
	 * URLを生成
	 *
	 * @return {Promise} APIを取得するURL
	*/
	setURL (option) {
		const isSetId = option.isSetId || false;
		let url = 'https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426?';
		// カテゴリIDが必要だったらセット
		const params = {
			format: 'json',
			categoryId: this.setCategoryId({isSetId: true}),
			applicationId: '1099641121016352250',
		}

		// URL生成
		for (const param in params) {
			if (!(param === null)) {
				const str = `${param}=${params[param]}&`;
				url += str;
			}
		}
		return url;
	}
	/**
	 * ランダムのカテゴリIDを取得
	 *
	 * @return {number} カテゴリID or null
	 * @return {number} カテゴリIDをセットするか
	*/
	setCategoryId (option) {
		const isSetId = option.isSetId || false;
		if (isSetId) {
			return this.categoryIdList[this.setRandomNum(this.categoryIdList.length)];
		} else {
			return null;
		}
	}
	/**
	 * 引数のうちランダムな整数を返す
	 *
	 * @return {Number} 整数
	 * @return {Array} 上限の数字
	*/
	setRandomNum (number) {
		return Math.floor(Math.random() * number);
	}
	/**
	 * カセットのデータを更新
	 *
	 * @return {Number} 整数
	 * @return {Array} 上限の数字
	*/
	updateCassetteContents () {
		for (let i = 0; i < 7; i++) {
			const recipeData = this.data[i].recipe;
			const $target = $(`.js-recipe[data-date-num="${i}"]`);

			// 画像
			const $img = $target.find('.js-recipe_image');
			$img.attr('style', `background-image:url(${recipeData.foodImageUrl});`);
			// 時間
			const $time = $target.find('.js-recipe_time');
			$time.text(recipeData.recipeIndication);
			// 金額
			const $price = $target.find('.js-recipe_price');
			$price.text(recipeData.recipeCost);
			// タイトル
			const $title = $target.find('.js-recipe_title');
			$title.text(recipeData.recipeTitle);
		}
	}
	/**
	 * モーダルのデータを更新
	 *
	 * @return {Number} 整数
	 * @return {Array} 上限の数字
	*/
	updateModalContents ({$currentTarget, recipeClassName}) {
		const $recipe = $currentTarget.closest('.' + recipeClassName);
		const num = $recipe.data('date-num');

		const recipeData = this.data[num].recipe;
		const $target = $('.js-modal_recipe');
		// $target.scrollTo(0, 0);

		// レシピ区分
		const $subTitle = $('.js-modal_sub_title')
		const division = ['今日', '明日', '明後日', '3日後', '4日後', '5日後', '6日後'];
		$subTitle.text(`${division[num]}のレシピ`);
		// 画像
		const $img = $target.find('.js-modal_image');
		$img.attr('src', recipeData.foodImageUrl);
		$img.attr('alt', recipeData.recipeTitle);
		// 時間
		const $time = $target.find('.js-modal_time');
		$time.text(recipeData.recipeIndication);
		// 金額
		const $price = $target.find('.js-modal_price');
		$price.text(recipeData.recipeCost);
		// タイトル
		const $title = $target.find('.js-modal_title');
		$title.text(recipeData.recipeTitle);
		// 説明
		const $text = $target.find('.js-modal_text');
		$text.text(recipeData.recipeDescription);
		// 材料
		const $material = $target.find('.js-modal_material');
		for (var i = 0; i < recipeData.recipeMaterial.length; i++) {
			const insertHtml = `
				<tr><td>${recipeData.recipeMaterial[i]}</td></tr>
			`;
			$material.append(insertHtml);
		}
		// リンク
		const $link = $target.find('.js-modal_link');
		$link.attr('href', recipeData.recipeUrl);
	}
}

export default RakutenRecepiAPI;